import { supabase } from "./supabase"

export interface PeopleGoal {
  id?: number
  employee_id: string
  people_goal: string
  gps_score: number
  pei_score: number
  refresh_off_usage_rate: number
  coaching_time?: number
  created_at?: string
  updated_at?: string
}

// 팀원 코칭 데이터 인터페이스
export interface TeamMemberCoachingData {
  empno: string
  empnm: string
  org_nm: string
  job_info_nm: string
  gradnm: string
  totalCoachingHours: number
  coachingData: any[]
}

export class PeopleGoalsService {
  // 최신 목표 가져오기
  static async getLatestGoals(employeeId: string): Promise<PeopleGoal | null> {
    try {
      // 사번 정규화 (95129 → 095129)
      const { ReviewerService } = await import('./reviewer-service')
      const normalizedEmployeeId = ReviewerService.normalizeEmpno(employeeId)
      console.log(`🔧 PeopleGoalsService: Normalizing employee ID: ${employeeId} → ${normalizedEmployeeId}`)
      
      const { data, error } = await supabase
        .from("people_goals")
        .select("*")
        .eq("employee_id", normalizedEmployeeId)
        .order("created_at", { ascending: false })
        .limit(1)
      if (error) return null
      if (!data || data.length === 0) return null
      return data[0]
    } catch (error) {
      return null
    }
  }

  // 새 레코드 추가 (항상 새 행)
  static async saveGoals(
    employeeId: string,
    goals: Omit<PeopleGoal, "id" | "employee_id" | "created_at" | "updated_at">,
  ): Promise<PeopleGoal | null> {
    try {
      // 사번 정규화 (95129 → 095129)
      const { ReviewerService } = await import('./reviewer-service')
      const normalizedEmployeeId = ReviewerService.normalizeEmpno(employeeId)
      console.log(`🔧 PeopleGoalsService: Normalizing employee ID for save: ${employeeId} → ${normalizedEmployeeId}`)
      
      const goalData = {
        employee_id: normalizedEmployeeId,
        ...goals,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const { data, error } = await supabase.from("people_goals").insert(goalData).select()
      if (error) throw error
      if (!data || data.length === 0) throw new Error("No data returned after insert")
      return data[0]
    } catch (error) {
      throw error
    }
  }

  // 특정 필드만 업데이트 (항상 새 행)
  static async updateSpecificFields(
    employeeId: string,
    updates: Partial<Omit<PeopleGoal, "id" | "employee_id" | "created_at" | "updated_at">>,
  ): Promise<PeopleGoal | null> {
    try {
      // 사번 정규화 (95129 → 095129)
      const { ReviewerService } = await import('./reviewer-service')
      const normalizedEmployeeId = ReviewerService.normalizeEmpno(employeeId)
      console.log(`🔧 PeopleGoalsService: Normalizing employee ID for update: ${employeeId} → ${normalizedEmployeeId}`)
      
      const latestGoal = await this.getLatestGoals(employeeId)
      const newGoalData = {
        employee_id: normalizedEmployeeId,
        people_goal: updates.people_goal ?? latestGoal?.people_goal ?? "",
        gps_score: updates.gps_score ?? latestGoal?.gps_score ?? 1,
        pei_score: updates.pei_score ?? latestGoal?.pei_score ?? 1,
        refresh_off_usage_rate: updates.refresh_off_usage_rate ?? latestGoal?.refresh_off_usage_rate ?? 0,
        coaching_time: updates.coaching_time ?? latestGoal?.coaching_time ?? 0, // 추가!
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const { data, error } = await supabase.from("people_goals").insert(newGoalData).select()
      if (error) throw error
      if (!data || data.length === 0) throw new Error("No data returned after insert")
      return data[0]
    } catch (error) {
      throw error
    }
  }

  // 코칭 시간 통계 (이번 분기, 회계연도 누적: 6월말 기준 2025-3Q ~ 2026-2Q)
  static async getCoachingTimeStats(empno: string, year: number, quarter: number): Promise<{ quarterHours: number, yearHours: number }> {
    // 사번 정규화 (95129 → 095129)
    const { ReviewerService } = await import('./reviewer-service')
    const normalizedEmpno = ReviewerService.normalizeEmpno(empno)
    console.log(`🔧 getCoachingTimeStats: Normalizing empno: ${empno} → ${normalizedEmpno}`)
    
    const yearQuarter = `${year}-Q${quarter}`;
    
    // 사번 170068인 경우 특정 PRJTCD만 필터링 (정규화된 사번으로 비교)
    const isSpecialEmpno = normalizedEmpno === '170068';
    const targetPrjtcd = '00184-90-323';
    
    // 이번 분기: 여러 row 합산
    let quarterQuery = supabase
      .from('v_coaching_time_quarterly')
      .select('total_use_time')
      .eq('EMPNO', normalizedEmpno)
      .in('year_quarter', [yearQuarter]);
    
    if (isSpecialEmpno) {
      quarterQuery = quarterQuery.eq('PRJTCD', targetPrjtcd);
    }
    
    const { data: quarterRows, error: qErr } = await quarterQuery.limit(100);
    if (qErr) {
      // 404 에러, 타임아웃 에러, 뷰가 없는 경우 - 빈 배열로 처리
      if (qErr.code === 'PGRST116' || qErr.code === '42P01' || qErr.code === '57014' || qErr.message?.includes('does not exist') || qErr.message?.includes('statement timeout')) {
        console.warn(`⚠️ v_coaching_time_quarterly 뷰 조회 실패 (${qErr.code || 'unknown'}). 빈 데이터로 처리합니다.`, qErr.message);
        return { quarterHours: 0, yearHours: 0 };
      }
      throw qErr;
    }

    // 회계연도 누적 (2025-3Q ~ 2026-2Q): 6월말 기준 회계연도
    const fiscalYearQuarters = [
      '2025-Q3', '2025-Q4', 
      '2026-Q1', '2026-Q2'
    ];
    
    console.log(`🗓️ Coaching: Fiscal year quarters for ${normalizedEmpno}:`, fiscalYearQuarters);
    if (isSpecialEmpno) {
      console.log(`🎯 Special filtering for empno ${normalizedEmpno}: PRJTCD = ${targetPrjtcd}`);
    }
    
    let yearQuery = supabase
      .from('v_coaching_time_quarterly')
      .select('total_use_time, year_quarter')
      .eq('EMPNO', normalizedEmpno)
      .in('year_quarter', fiscalYearQuarters);
    
    if (isSpecialEmpno) {
      yearQuery = yearQuery.eq('PRJTCD', targetPrjtcd);
    }
    
    const { data: yearRows, error: yErr } = await yearQuery.limit(200);
    if (yErr) {
      // 404 에러, 타임아웃 에러, 뷰가 없는 경우 - 빈 배열로 처리
      if (yErr.code === 'PGRST116' || yErr.code === '42P01' || yErr.code === '57014' || yErr.message?.includes('does not exist') || yErr.message?.includes('statement timeout')) {
        console.warn(`⚠️ v_coaching_time_quarterly 뷰 조회 실패 (${yErr.code || 'unknown'}). 빈 데이터로 처리합니다.`, yErr.message);
        return { quarterHours: 0, yearHours: 0 };
      }
      throw yErr;
    }

    const quarterHours = (quarterRows ?? []).reduce((sum, row) => sum + Number(row.total_use_time || 0), 0);
    const yearHours = (yearRows ?? []).reduce((sum, row) => sum + Number(row.total_use_time || 0), 0);

    console.log(`📊 Coaching time stats for ${normalizedEmpno}:`, {
      currentQuarter: yearQuarter,
      quarterHours,
      fiscalYearTotal: yearHours,
      fiscalYearData: yearRows,
      isSpecialFiltered: isSpecialEmpno
    });

    return { quarterHours, yearHours };
  }

  // 팀원들의 코칭 시간 통계 (리뷰어의 PRJTCD 기준)
  static async getTeamCoachingTimeStats(managerEmpno: string): Promise<TeamMemberCoachingData[]> {
    try {
      // 사번 정규화 (95129 → 095129)
      const { ReviewerService } = await import('./reviewer-service')
      const normalizedManagerEmpno = ReviewerService.normalizeEmpno(managerEmpno)
      console.log(`🔧 getTeamCoachingTimeStats: Normalizing manager empno: ${managerEmpno} → ${normalizedManagerEmpno}`)
      
      // 1. 회계연도 분기 정의 (2025-3Q ~ 2026-2Q): 6월말 기준 회계연도
      const fiscalYearQuarters = [
        '2025-Q3', '2025-Q4', 
        '2026-Q1', '2026-Q2'
      ]
      
      // 사번 170068인 경우 특정 PRJTCD만 필터링 (정규화된 사번으로 비교)
      const isSpecialEmpno = normalizedManagerEmpno === '170068';
      const targetPrjtcd = '00184-90-323';
      
      // 2. 리뷰어의 PRJTCD들을 먼저 조회
      let managerProjectQuery = supabase
        .from('v_coaching_time_quarterly')
        .select('PRJTCD')
        .eq('EMPNO', normalizedManagerEmpno)
        .in('year_quarter', fiscalYearQuarters);
      
      if (isSpecialEmpno) {
        managerProjectQuery = managerProjectQuery.eq('PRJTCD', targetPrjtcd);
      }
      
      const { data: managerProjects, error: projectError } = await managerProjectQuery.limit(50);
      
      if (projectError) {
        // 타임아웃 에러나 뷰 조회 실패 시 빈 배열 반환
        if (projectError.code === '57014' || projectError.message?.includes('statement timeout')) {
          console.warn("⚠️ Manager projects query timeout - returning empty array:", projectError.message)
          return []
        }
        console.error("Error fetching manager projects:", projectError)
        return []
      }
      
      if (!managerProjects || managerProjects.length === 0) {
        console.log("🔍 No coaching projects found for manager:", normalizedManagerEmpno)
        return []
      }
      
      // 3. 리뷰어의 고유 PRJTCD 목록 추출
      const managerPRJTCDs = [...new Set(managerProjects.map(p => p.PRJTCD))]
      console.log(`📋 Manager ${normalizedManagerEmpno} PRJTCD list:`, managerPRJTCDs)
      if (isSpecialEmpno) {
        console.log(`🎯 Special filtering for manager ${normalizedManagerEmpno}: only PRJTCD = ${targetPrjtcd}`);
      }
      
      // 4. 해당 PRJTCD들에서 리뷰어가 아닌 다른 EMPNO들의 코칭 시간 조회
      const { data: teamCoachingData, error: teamError } = await supabase
        .from('v_coaching_time_quarterly')
        .select('EMPNO, PRJTCD, total_use_time, year_quarter')
        .in('PRJTCD', managerPRJTCDs)
        .neq('EMPNO', normalizedManagerEmpno)  // 리뷰어 제외
        .in('year_quarter', fiscalYearQuarters)
        .limit(500)
      
      if (teamError) {
        // 타임아웃 에러나 뷰 조회 실패 시 빈 배열 반환
        if (teamError.code === '57014' || teamError.message?.includes('statement timeout')) {
          console.warn("⚠️ Team coaching data query timeout - returning empty array:", teamError.message)
          return []
        }
        console.error("Error fetching team coaching data:", teamError)
        return []
      }
      
      if (!teamCoachingData || teamCoachingData.length === 0) {
        console.log("🔍 No team coaching data found for projects:", managerPRJTCDs)
        return []
      }
      
      // 5. EMPNO별로 그룹화하여 누적 시간 계산 (각 팀원의 170068 필터링도 적용)
      const empnoMap = new Map<string, number>()
      teamCoachingData.forEach(row => {
        const empno = row.EMPNO
        const prjtcd = row.PRJTCD
        const hours = Number(row.total_use_time || 0)
        
        // 팀원이 170068인 경우에도 특정 PRJTCD만 집계
        if (empno === '170068' && prjtcd !== targetPrjtcd) {
          console.log(`🎯 Filtering out non-target PRJTCD for team member ${empno}: ${prjtcd} (target: ${targetPrjtcd})`)
          return // 해당 레코드는 무시
        }
        
        empnoMap.set(empno, (empnoMap.get(empno) || 0) + hours)
      })
      
      console.log(`📊 Team coaching hours by EMPNO:`, Object.fromEntries(empnoMap))
      
      // 6. ReviewerService로 팀원 목록 가져와서 매칭 (이미 import되어 있음)
      const userRole = await ReviewerService.getUserRole(normalizedManagerEmpno)
      
      // 7. 팀원들의 HR 정보와 코칭 시간 매칭
      const teamMembersData: TeamMemberCoachingData[] = []
      
      for (const [empno, totalHours] of empnoMap.entries()) {
        try {
          const normalizedEmpno = ReviewerService.normalizeEmpno(empno)
          
          // HR 정보 조회
          const { data: hrData } = await supabase
            .from('a_hr_master')
            .select('EMPNO, EMPNM, ORG_NM, JOB_INFO_NM, GRADNM')
            .eq('EMPNO', normalizedEmpno)
            .maybeSingle()
          
          // 리뷰어 테이블에서 매칭되는 팀원 찾기
          const revieweeInfo = userRole.reviewees?.find(r => 
            ReviewerService.normalizeEmpno(r.사번) === normalizedEmpno
          )
          
          // 팀원의 상세 코칭 데이터도 필터링 적용
          const memberCoachingData = teamCoachingData.filter(row => {
            if (row.EMPNO !== empno) return false
            // 팀원이 170068인 경우 특정 PRJTCD만 포함
            if (empno === '170068' && row.PRJTCD !== targetPrjtcd) {
              return false
            }
            return true
          })

          teamMembersData.push({
            empno: empno,
            empnm: hrData?.EMPNM || revieweeInfo?.성명 || '퇴사자',
            org_nm: hrData?.ORG_NM || revieweeInfo?.['FY26 팀명'] || '',
            job_info_nm: hrData?.JOB_INFO_NM || '',
            gradnm: hrData?.GRADNM || '',
            totalCoachingHours: totalHours,
            coachingData: memberCoachingData
          })
          
        } catch (error) {
          console.error(`Error fetching HR data for EMPNO ${empno}:`, error)
          
          // 에러가 있어도 기본 정보는 추가 (필터링 적용)
          const memberCoachingData = teamCoachingData.filter(row => {
            if (row.EMPNO !== empno) return false
            // 팀원이 170068인 경우 특정 PRJTCD만 포함
            if (empno === '170068' && row.PRJTCD !== targetPrjtcd) {
              return false
            }
            return true
          })

          teamMembersData.push({
            empno: empno,
            empnm: '퇴사자',
            org_nm: '',
            job_info_nm: '',
            gradnm: '',
            totalCoachingHours: totalHours,
            coachingData: memberCoachingData
          })
        }
      }
      
      // 8. 코칭 시간 순으로 정렬 (많은 순)
      teamMembersData.sort((a, b) => b.totalCoachingHours - a.totalCoachingHours)
      
      console.log(`📊 Final team coaching data for manager ${managerEmpno}:`, {
        managerPRJTCDs,
        totalMembers: teamMembersData.length,
        teamMembersData
      })
      
      return teamMembersData
      
    } catch (error) {
      console.error("Error fetching team coaching time stats:", error)
      return []
    }
  }
} 