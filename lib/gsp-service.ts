import { supabase } from "./supabase"

export interface GSPData {
  ID?: number  // 히스토리 관리용 ID
  NO: string
  사번: string
  성명: string
  "FY26 팀명": string
  "Reviewer 사번": string
  "1차 Reviewer": string
  "보직(HC)": string | null
  보직: string | null
  산업전문화: string | null
  "Council/TF 등": string | null
  TF_Council: string | null
  "GSP/Focus 30": string | null  // ⭐ 하나로 합쳐진 컬럼
  STATUS: string
  업데이트일자: string
  생성일자: string
  // 개별 상태 필드 추가
  "보직_STATUS"?: string
  "산업전문화_STATUS"?: string
  "Council_TF_STATUS"?: string
  "GSP_Focus_30_STATUS"?: string  // ⭐ 상태 필드도 하나로 합침
  "전체_STATUS"?: string
  // 히스토리 관리 필드들
  "이전_레코드_ID"?: number | null
  "버전"?: number
  "변경요청일자"?: string
  "처리일자"?: string | null
  // 승인완료된 값들 (intro 페이지용)
  approved_보직?: string | null
  approved_산업전문화?: string | null
  approved_gsp_focus_30?: string | null
  approved_council_tf?: string | null
}

export class GSPService {
  // 사용자의 GSP 입력 상태 확인 (최신 레코드 기준)
  static async checkGSPStatus(empno: string): Promise<{
    exists: boolean
    needsInput: boolean
    data?: GSPData
  }> {
    try {
      // ReviewerService import 및 사번 정규화
      const { ReviewerService } = await import("@/lib/reviewer-service")
      const normalizedEmpno = ReviewerService.normalizeEmpno(empno)
      
      console.log(`🔍 GSPService: Checking latest GSP status for ${empno} → ${normalizedEmpno}`)
      
      // 최신 레코드 조회 (변경요청일자 기준 DESC)
      let { data: records, error } = await supabase
        .from("a_GSP_Table")
        .select("*")
        .eq("사번", normalizedEmpno)
        .order("변경요청일자", { ascending: false })
        .limit(1)
      
      let data = records?.[0] || null
      
      // 정규화된 사번으로 못 찾으면 원본 사번으로 다시 시도
      if (!data && !error) {
        const originalEmpno = empno.replace(/^0+/, '') // 앞의 0 제거
        console.log(`🔄 GSPService: Trying with original empno: ${originalEmpno}`)
        const result = await supabase
          .from("a_GSP_Table")
          .select("*")
          .eq("사번", originalEmpno)
          .order("변경요청일자", { ascending: false })
          .limit(1)
        data = result.data?.[0] || null
        error = result.error
      }
      
      console.log("🔄 GSPService: Query executed, data:", data, "error:", error)

      if (error) {
        console.error("❌ GSPService: Error checking GSP status:", error)
        console.error("Error details:", { code: error.code, message: error.message, details: error.details })
        return { exists: false, needsInput: false }
      }

      if (!data) {
        console.log("ℹ️ GSPService: No GSP record found for user - 테이블에 해당 사번이 없습니다")
        console.log("💡 최초 사용자이므로 GSP 입력이 필요합니다")
        return { exists: false, needsInput: true }
      }

      // 모든 필드가 입력되어야 하고 상태가 Draft면 입력이 필요
      const hasGSPFocus30 = !!(data["GSP/Focus 30"] && data["GSP/Focus 30"] !== null && String(data["GSP/Focus 30"]).trim())
      const has보직 = !!(data.보직 && data.보직 !== null && String(data.보직).trim())
      const has산업전문화 = !!(data.산업전문화 && data.산업전문화 !== null && String(data.산업전문화).trim())
      const hasTFCouncil = !!(data.TF_Council && data.TF_Council !== null && String(data.TF_Council).trim())
      const needsInput = (!hasGSPFocus30 || !has보직 || !has산업전문화 || !hasTFCouncil) && (data.STATUS === 'Draft' || !data.STATUS)
      
      console.log("✅ GSPService: GSP status check result:", {
        exists: true,
        needsInput,
        status: data.STATUS,
        hasGSPFocus30,
        has보직,
        has산업전문화,
        hasTFCouncil,
        gspFocus30Content: data["GSP/Focus 30"] || "null",
        보직Content: data.보직 || "null",
        산업전문화Content: data.산업전문화 || "null",
        tfCouncilContent: data.TF_Council || "null"
      })

      return {
        exists: true,
        needsInput,
        data: data as GSPData
      }
    } catch (error) {
      console.error("❌ GSPService: Error in checkGSPStatus:", error)
      return { exists: false, needsInput: false }
    }
  }



  // 개별 항목 업데이트 (새 레코드 INSERT 방식)
  static async updateGSPItem(empno: string, field: string, value: string): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const { ReviewerService } = await import("@/lib/reviewer-service")
      const normalizedEmpno = ReviewerService.normalizeEmpno(empno)
      
      console.log(`🔄 GSPService: Creating new history record for ${field} update: ${empno} → ${normalizedEmpno}`)
      
      // 1. 현재 최신 레코드 조회
      const currentStatus = await this.checkGSPStatus(normalizedEmpno)
      const currentData = currentStatus.data
      
      if (!currentData) {
        console.error("❌ GSPService: No current GSP data found")
        return { success: false, message: "기존 GSP 데이터를 찾을 수 없습니다." }
      }
      
      // 2. 새 레코드 데이터 준비 (기존 데이터 복사 + 변경 항목만 업데이트)
      const newRecordData: any = {
        "NO": currentData.NO,
        "사번": normalizedEmpno,
        "성명": currentData.성명,
        "FY26 팀명": currentData["FY26 팀명"],
        "Reviewer 사번": currentData["Reviewer 사번"],
        "1차 Reviewer": currentData["1차 Reviewer"],
        
        // 기존 값들 복사
        "보직(HC)": currentData["보직(HC)"],
        "보직_STATUS": currentData["보직_STATUS"],
        "산업전문화": currentData["산업전문화"],
        "산업전문화_STATUS": currentData["산업전문화_STATUS"],
        "Council/TF 등": currentData["Council/TF 등"],
        "Council_TF_STATUS": currentData["Council_TF_STATUS"],
        "GSP/Focus 30": currentData["GSP/Focus 30"],
        "GSP_Focus_30_STATUS": currentData["GSP_Focus_30_STATUS"],
        
        // 히스토리 관련
        "이전_레코드_ID": currentData.ID || null,
        "버전": (currentData.버전 || 1) + 1,
        "변경요청일자": new Date().toISOString()
      }
      
      // 3. 변경하는 필드만 업데이트
      const fieldMapping: Record<string, {dataField: string, statusField: string}> = {
        '보직': { dataField: '보직(HC)', statusField: '보직_STATUS' },
        '산업전문화': { dataField: '산업전문화', statusField: '산업전문화_STATUS' },
        'TF_Council': { dataField: 'Council/TF 등', statusField: 'Council_TF_STATUS' },
        'GSP_Focus30': { dataField: 'GSP/Focus 30', statusField: 'GSP_Focus_30_STATUS' }
      }
      
      const mapping = fieldMapping[field]
      if (!mapping) {
        throw new Error(`Invalid field: ${field}`)
      }
      
      // 변경하는 필드의 값과 상태 업데이트
      newRecordData[mapping.dataField] = value
      newRecordData[mapping.statusField] = '승인대기'
      
      console.log("🔧 New record data:", newRecordData)
      
      // 4. 새 레코드 INSERT
      const { data, error } = await supabase
        .from('a_GSP_Table')
        .insert([newRecordData])
        .select()
      
      if (error) {
        console.error("❌ GSPService: Error inserting new GSP record:", error)
        throw error
      }
      
      console.log("✅ GSPService: New GSP record created successfully:", data)
      return { success: true, message: `${field} 변경신청이 완료되었습니다.` }
    } catch (error) {
      console.error("❌ GSPService: Error in updateGSPItem:", error)
      return { success: false, message: `${field} 변경신청 중 오류가 발생했습니다.` }
    }
  }

  // GSP/Focus 30, 보직, 산업전문화, TF&Council 입력/수정 (통합된 메서드)
  static async updateGSP(empno: string, gspFocus30: string, 보직?: string, 산업전문화?: string, tfCouncil?: string): Promise<{
    success: boolean
    message: string
  }> {
    try {
      // ReviewerService import 및 사번 정규화
      const { ReviewerService } = await import("@/lib/reviewer-service")
      const normalizedEmpno = ReviewerService.normalizeEmpno(empno)
      
      console.log(`🔄 GSPService: Updating GSP/Focus 30 for ${empno} → ${normalizedEmpno}`)
      
      // 업데이트할 데이터 객체 생성
      const updateData: any = {
        "GSP/Focus 30": gspFocus30,
        STATUS: '승인대기',
        "업데이트일자": new Date().toISOString()
      }
      
      // 선택적 필드들 추가
      if (보직 !== undefined) updateData.보직 = 보직
      if (산업전문화 !== undefined) updateData.산업전문화 = 산업전문화
      if (tfCouncil !== undefined) updateData.TF_Council = tfCouncil

      // 정규화된 사번과 원본 사번 둘 다 시도
      let { error } = await supabase
        .from("a_GSP_Table")
        .update(updateData)
        .eq("사번", normalizedEmpno)
      
      // 정규화된 사번으로 업데이트 안 되면 원본 사번으로 시도
      if (error && error.code === 'PGRST116') { // No rows updated
        const originalEmpno = empno.replace(/^0+/, '')
        console.log(`🔄 GSPService: Trying update with original empno: ${originalEmpno}`)
        const result = await supabase
          .from("a_GSP_Table")
          .update(updateData)
          .eq("사번", originalEmpno)
        error = result.error
      }

      if (error) {
        console.error("❌ GSPService: Error updating GSP:", error)
        return {
          success: false,
          message: "GSP 정보 업데이트 중 오류가 발생했습니다."
        }
      }

      console.log("✅ GSPService: GSP/Focus 30 updated successfully")
      return {
        success: true,
        message: "GSP/Focus 30 정보가 성공적으로 저장되었습니다. 승인을 기다려주세요."
      }
    } catch (error) {
      console.error("❌ GSPService: Error in updateGSP:", error)
      return {
        success: false,
        message: "GSP 정보 업데이트 중 오류가 발생했습니다."
      }
    }
  }

  // 1차 Reviewer가 승인해야 할 GSP 요청 목록 조회 (히스토리 방식)
  static async getPendingApprovalsFixed(reviewerEmpno: string): Promise<{
    success: boolean
    data: Array<GSPData & {
      empnm: string
      org_nm: string
      profile_image?: string
    }>
  }> {
    try {
      // ReviewerService import 및 사번 정규화
      const { ReviewerService } = await import("@/lib/reviewer-service")
      const normalizedReviewerEmpno = ReviewerService.normalizeEmpno(reviewerEmpno)
      const strippedReviewerEmpno = normalizedReviewerEmpno.replace(/^0+/, '')

      console.log(`🔍 GSPService: Getting pending approvals for reviewer ${reviewerEmpno} → ${normalizedReviewerEmpno}`)

      // GSP 승인 마스터 권한 체크 (L_Reviewer_Master.can_approve_gsp = true 면 전체 조회)
      const { data: masterCheck } = await supabase
        .from('L_Reviewer_Master')
        .select('can_approve_gsp')
        .or(`사번.eq.${normalizedReviewerEmpno},사번.eq.${strippedReviewerEmpno}`)
        .limit(1)
        .maybeSingle()

      const isGspApprovalMaster = masterCheck?.can_approve_gsp === true

      let latestRecords: any[] | null = null
      let latestError: any = null

      if (isGspApprovalMaster) {
        console.log('👑 GSP 승인 마스터 - 전체 승인대기 조회')
        const result = await supabase
          .from("a_GSP_Table")
          .select("*")
          .order('변경요청일자', { ascending: false })
        latestRecords = result.data
        latestError = result.error
      } else {
        // 본인이 Reviewer로 지정된 요청만 조회
        const result1 = await supabase
          .from("a_GSP_Table")
          .select("*")
          .eq('Reviewer 사번', normalizedReviewerEmpno)
          .order('변경요청일자', { ascending: false })
        latestRecords = result1.data
        latestError = result1.error

        // 정규화된 사번으로 못 찾으면 원본 사번으로 다시 시도
        if ((!latestRecords || latestRecords.length === 0) && !latestError) {
          console.log(`🔄 GSPService: Trying with original reviewer empno: ${strippedReviewerEmpno}`)
          const result2 = await supabase
            .from("a_GSP_Table")
            .select("*")
            .eq('Reviewer 사번', strippedReviewerEmpno)
            .order('변경요청일자', { ascending: false })
          latestRecords = result2.data
          latestError = result2.error
        }
      }
      
      if (latestError) {
        console.error("❌ GSPService: Error getting latest records:", latestError)
        return { success: false, data: [] }
      }
      
      if (!latestRecords || latestRecords.length === 0) {
        console.log("ℹ️ GSPService: No pending approvals found")
        return { success: true, data: [] }
      }
      
      // 사번별로 그룹화해서 최신 레코드만 필터링하고 승인대기 상태 확인
      const empnoMap = new Map()
      const pendingData = latestRecords.filter(record => {
        const empno = record.사번
        if (!empnoMap.has(empno)) {
          empnoMap.set(empno, record)
          // 승인대기 상태인 항목이 있는지 확인
          const hasPending = 
            record["보직_STATUS"] === '승인대기' ||
            record["산업전문화_STATUS"] === '승인대기' ||
            record["Council_TF_STATUS"] === '승인대기' ||
            record["GSP_Focus_30_STATUS"] === '승인대기'
          return hasPending
        }
        return false
      })
      
      console.log(`📋 GSPService: Found ${pendingData.length} pending approval records`)

      // ⚡ 배치 사전 로딩: HR, 사진을 한 번에 가져와서 N+1 제거
      // (ReviewerService는 이미 함수 상단에서 import됨)
      const allEmpnoVariants = new Set<string>()
      for (const item of pendingData) {
        const norm = ReviewerService.normalizeEmpno(item.사번)
        allEmpnoVariants.add(norm)
        allEmpnoVariants.add(String(item.사번).replace(/^0+/, '')) // 원본
      }
      const empnoList = Array.from(allEmpnoVariants).filter(Boolean)

      const [hrBatchRes, photoBatchRes] = await Promise.all([
        supabase.from("a_hr_master")
          .select("EMPNO, EMPNM, ORG_NM, JOB_INFO_NM")
          .in("EMPNO", empnoList),
        supabase.from("employee_photos")
          .select("empno, photo_url")
          .in("empno", empnoList),
      ])

      const hrMap = new Map<string, any>()
      hrBatchRes.data?.forEach(r => hrMap.set(String(r.EMPNO), r))
      const photoMap = new Map<string, string>()
      photoBatchRes.data?.forEach(p => { if (p.photo_url) photoMap.set(String(p.empno), p.photo_url) })

      const lookupHr = (empno: string) => {
        const norm = ReviewerService.normalizeEmpno(empno)
        return hrMap.get(norm) || hrMap.get(String(empno).replace(/^0+/, '')) || null
      }
      const lookupPhoto = (empno: string) => {
        const norm = ReviewerService.normalizeEmpno(empno)
        return photoMap.get(norm) || photoMap.get(String(empno).replace(/^0+/, '')) || null
      }

      const approvals = await Promise.all(pendingData.map(async (item: any) => {
        const normalizedEmpno = ReviewerService.normalizeEmpno(item.사번)

        const hrData = lookupHr(item.사번)
        const photoData = lookupPhoto(item.사번) ? { photo_url: lookupPhoto(item.사번) } : null

        // UserInfoMapper는 자체 캐시 있음 (배치 호출은 안 하지만 추후 캐시 히트)
        const { UserInfoMapper } = await import("@/data/user-info")
        let baseUserInfo = null
        try {
          baseUserInfo = await UserInfoMapper.loadUserInfo(normalizedEmpno)
          if (!baseUserInfo) {
            const originalEmpno = String(item.사번).replace(/^0+/, '')
            baseUserInfo = await UserInfoMapper.loadUserInfo(originalEmpno)
          }
        } catch (error) {
          console.error("❌ GSPService: Error loading base user info:", error)
        }

        // 현재 사용자의 intro에 표시되는 값을 정확히 계산 (히스토리 기준)
        const getCurrentDisplayValue = async (field: string, targetEmpno: string) => {
          try {
                    console.log(`🔍 GSPService: Getting current display value for ${field}, empno: ${targetEmpno}`)
        
        // 먼저 해당 사번의 모든 레코드 조회 (디버깅용)
        const { data: allRecords, error: allError } = await supabase
          .from("a_GSP_Table")
          .select("ID, 사번, 변경요청일자, GSP_Focus_30_STATUS, \"GSP/Focus 30\", 보직_STATUS, \"보직(HC)\"")
          .eq("사번", targetEmpno)
          .order('변경요청일자', { ascending: false })
          
        console.log(`📊 ALL RECORDS for ${targetEmpno}:`, allRecords)
        console.log(`📊 Error:`, allError)
        
        // 이전 승인완료된 레코드 조회 (현재 승인대기 레코드 제외)
        const { data: previousRecords, error: prevError } = await supabase
          .from("a_GSP_Table")
          .select("*")
          .eq("사번", targetEmpno)
          .order('변경요청일자', { ascending: false })
            
            console.log(`📋 GSPService: Found ${previousRecords?.length || 0} records for ${targetEmpno}`)
            console.log(`📋 GSPService: Records:`, previousRecords?.map(r => ({
              ID: r.ID,
              변경요청일자: r.변경요청일자,
              GSP_Focus_30_STATUS: r["GSP_Focus_30_STATUS"],
              "GSP/Focus 30": r["GSP/Focus 30"]
            })))
            
            if (prevError) {
              console.error("❌ GSPService: Error getting previous records:", prevError)
              return baseUserInfo?.[field === 'job_info_nm' ? 'job_info_nm' : 
                                    field === 'industry_specialization' ? 'industry_specialization' :
                                    field === 'council_tf' ? 'council_tf' : 'gsp_focus_30'] || "정보 없음"
            }
            
            // 해당 필드의 가장 최근 승인완료 값 찾기
            const fieldStatusMap = {
              'job_info_nm': { statusField: '보직_STATUS', dataField: '보직(HC)' },
              'industry_specialization': { statusField: '산업전문화_STATUS', dataField: '산업전문화' },
              'council_tf': { statusField: 'Council_TF_STATUS', dataField: 'Council/TF 등' },
              'gsp_focus_30': { statusField: 'GSP_Focus_30_STATUS', dataField: 'GSP/Focus 30' }
            }
            
            const fieldInfo = fieldStatusMap[field as keyof typeof fieldStatusMap]
            if (!fieldInfo) return "정보 없음"
            
            console.log(`🔍 GSPService: Looking for ${fieldInfo.statusField} = '승인완료' in ${fieldInfo.dataField}`)
            
            // 승인완료된 가장 최근 레코드 찾기
            for (const record of previousRecords || []) {
              console.log(`📋 Checking record ${record.ID}: ${fieldInfo.statusField} = ${record[fieldInfo.statusField]}, ${fieldInfo.dataField} = ${record[fieldInfo.dataField]}`)
              
              if (record[fieldInfo.statusField] === '승인완료' && record[fieldInfo.dataField]) {
                console.log(`✅ Found approved ${field} value: ${record[fieldInfo.dataField]} from record ${record.ID}`)
                return record[fieldInfo.dataField]
              }
            }
            
            console.log(`❌ No approved ${field} found, using fallback`)
            
            // 승인완료된 값이 없으면 기본 DB 값 사용
            const fallbackField = field === 'job_info_nm' ? 'job_info_nm' : 
                                 field === 'industry_specialization' ? 'industry_specialization' :
                                 field === 'council_tf' ? 'council_tf' : 'gsp_focus_30'
            const fallbackValue = baseUserInfo?.[fallbackField] || hrData?.JOB_INFO_NM || "정보 없음"
            console.log(`📋 Using fallback value: ${fallbackValue}`)
            return fallbackValue
            
          } catch (error) {
            console.error(`❌ GSPService: Error getting current display value for ${field}:`, error)
            return "정보 없음"
          }
        }

        // 올바른 로직: 이전 레코드_ID를 따라가서 승인완료된 값 찾기
        const getCurrentValueFromHistory = async (field: string) => {
          try {
            const currentRecord = item // 현재 승인대기 레코드 (버전 2)
            
            console.log(`🔍 Getting ${field} from history. Current record:`, {
              ID: currentRecord.ID,
              버전: currentRecord.버전,
              이전_레코드_ID: currentRecord.이전_레코드_ID
            })
            
            // 1. 현재 레코드에서 해당 필드가 승인대기가 아니면 그 값 사용
            const fieldMap = {
              'job_info_nm': { statusField: '보직_STATUS', dataField: '보직(HC)' },
              'industry_specialization': { statusField: '산업전문화_STATUS', dataField: '산업전문화' },
              'council_tf': { statusField: 'Council_TF_STATUS', dataField: 'Council/TF 등' },
              'gsp_focus_30': { statusField: 'GSP_Focus_30_STATUS', dataField: 'GSP/Focus 30' }
            }
            
            const fieldInfo = fieldMap[field as keyof typeof fieldMap]
            if (!fieldInfo) return "정보 없음"
            
            // 현재 레코드에서 해당 필드가 승인대기가 아니면 그 값 사용
            if (currentRecord[fieldInfo.statusField] !== '승인대기' && currentRecord[fieldInfo.dataField]) {
              console.log(`✅ Using current record value: ${currentRecord[fieldInfo.dataField]}`)
              return currentRecord[fieldInfo.dataField]
            }
            
            // 2. 이전 레코드가 있으면 그 레코드에서 찾기
            if (currentRecord.이전_레코드_ID) {
              const { data: previousRecords, error } = await supabase
                .from("a_GSP_Table")
                .select("*")
                .eq("ID", currentRecord.이전_레코드_ID)
                .limit(1)
              
              const previousRecord = previousRecords?.[0] || null
              
              console.log(`📋 Previous record (ID: ${currentRecord.이전_레코드_ID}):`, previousRecord)
              
              if (previousRecord && previousRecord[fieldInfo.dataField]) {
                console.log(`✅ Using previous record value: ${previousRecord[fieldInfo.dataField]}`)
                return previousRecord[fieldInfo.dataField]
              }
            }
            
            // 3. 기본값 사용
            const fallbackValue = field === 'job_info_nm' ? (baseUserInfo?.job_info_nm || hrData?.JOB_INFO_NM) :
                                 field === 'industry_specialization' ? baseUserInfo?.industry_specialization :
                                 field === 'council_tf' ? baseUserInfo?.council_tf :
                                 field === 'gsp_focus_30' ? baseUserInfo?.gsp_focus_30 : null
            
            console.log(`📋 Using fallback value: ${fallbackValue}`)
            return fallbackValue || "정보 없음"
            
          } catch (error) {
            console.error(`❌ Error getting ${field} from history:`, error)
            return "정보 없음"
          }
        }

        const finalData = {
          ...item,
          empnm: hrData?.EMPNM || item.성명 || "이름 없음",
          org_nm: hrData?.ORG_NM || "정보 없음",
          profile_image: photoData?.photo_url || null,
          // 기존값: 히스토리에서 이전 레코드 추적
          current_job_info_nm: await getCurrentValueFromHistory('job_info_nm'),
          current_industry_specialization: await getCurrentValueFromHistory('industry_specialization'),
          current_council_tf: await getCurrentValueFromHistory('council_tf'),
          current_gsp_focus_30: await getCurrentValueFromHistory('gsp_focus_30')
        }
        
        console.log(`✅ GSPService: Final approval data:`, {
          사번: item.사번,
          성명: item.성명,
          empnm: finalData.empnm,
          org_nm: finalData.org_nm,
          profile_image: finalData.profile_image ? 'exists' : 'null'
        })
        
        return finalData
      }))

      console.log("✅ GSPService: Found pending approvals:", approvals.length)
      return { success: true, data: approvals }
    } catch (error) {
      console.error("❌ GSPService: Error in getPendingApprovals:", error)
      return { success: false, data: [] }
    }
  }

  // 개별 항목 승인/반려 처리 (최신 레코드 기준)
  static async processItemApproval(empno: string, field: string, action: '승인완료' | '반려', reviewerEmpno: string): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const { ReviewerService } = await import("@/lib/reviewer-service")
      const normalizedEmpno = ReviewerService.normalizeEmpno(empno)
      const normalizedReviewerEmpno = ReviewerService.normalizeEmpno(reviewerEmpno)
      
      console.log(`🔄 GSPService: Processing ${action} for ${field} of ${empno} by reviewer ${reviewerEmpno}`)
      
      // 1. 최신 승인대기 레코드 조회 (single 대신 배열로 받기)
      const { data: latestRecords, error: queryError } = await supabase
        .from('a_GSP_Table')
        .select('*')
        .eq('사번', normalizedEmpno)
        .order('변경요청일자', { ascending: false })
        .limit(1)
      
      const latestRecord = latestRecords?.[0] || null
      
      if (queryError || !latestRecord) {
        console.error("❌ GSPService: Error finding latest record:", queryError)
        return { success: false, message: "최신 승인 요청을 찾을 수 없습니다." }
      }
      
      // 2. 권한 확인 (원본 사번도 함께 확인)
      const storedReviewerEmpno = latestRecord["Reviewer 사번"]
      const originalReviewerEmpno = reviewerEmpno.replace(/^0+/, '')
      
      console.log(`🔍 Authority check - stored: ${storedReviewerEmpno}, normalized: ${normalizedReviewerEmpno}, original: ${originalReviewerEmpno}`)
      
      if (storedReviewerEmpno !== normalizedReviewerEmpno && storedReviewerEmpno !== originalReviewerEmpno) {
        return { success: false, message: "해당 요청의 승인 권한이 없습니다." }
      }
      
      // 3. 필드별 상태 컬럼 매핑
      const statusFieldMapping: Record<string, string> = {
        '보직': '보직_STATUS',
        '산업전문화': '산업전문화_STATUS',
        'TF_Council': 'Council_TF_STATUS',
        'GSP_Focus30': 'GSP_Focus_30_STATUS'
      }
      
      const statusField = statusFieldMapping[field]
      if (!statusField) {
        return { success: false, message: "유효하지 않은 필드입니다." }
      }
      
      // 4. 해당 필드가 승인대기 상태인지 확인
      if (latestRecord[statusField] !== '승인대기') {
        return { success: false, message: `${field} 항목이 승인대기 상태가 아닙니다.` }
      }
      
      // 5. 상태 업데이트 및 처리일자 설정
      const updateData: any = {
        [statusField]: action,
        "처리일자": new Date().toISOString()
      }
      
      console.log(`🔧 Updating record ID ${latestRecord.ID} with:`, updateData)
      
      const { data: updateResult, error } = await supabase
        .from('a_GSP_Table')
        .update(updateData)
        .eq('ID', latestRecord.ID)
        .select()
      
      if (error) {
        console.error("❌ GSPService: Error updating item approval status:", error)
        console.error("❌ Error details:", { 
          code: error.code, 
          message: error.message, 
          details: error.details,
          hint: error.hint 
        })
        return { success: false, message: `${field} 승인 처리 중 오류가 발생했습니다: ${error.message}` }
      }
      
      console.log(`✅ GSPService: ${field} approval processed successfully for record ID: ${latestRecord.ID}`)
      return { 
        success: true, 
        message: action === '승인완료' ? `${field} 항목이 승인되었습니다.` : `${field} 항목이 반려되었습니다.`
      }
    } catch (error) {
      console.error("❌ GSPService: Error in processItemApproval:", error)
      return { success: false, message: "승인 처리 중 오류가 발생했습니다." }
    }
  }

  // 전체 승인/반려 처리 (기존 호환성 유지)
  static async processApproval(empno: string, action: '승인완료' | '반려', reviewerEmpno: string): Promise<{
    success: boolean
    message: string
  }> {
    try {
      // ReviewerService import 및 사번 정규화
      const { ReviewerService } = await import("@/lib/reviewer-service")
      const normalizedEmpno = ReviewerService.normalizeEmpno(empno)
      const normalizedReviewerEmpno = ReviewerService.normalizeEmpno(reviewerEmpno)
      
      console.log(`🔄 GSPService: Processing ${action} for ${empno} by reviewer ${reviewerEmpno}`)
      console.log(`🔍 GSPService: Normalized empnos - target: ${normalizedEmpno}, reviewer: ${normalizedReviewerEmpno}`)
      
      // 먼저 현재 사용자가 해당 요청의 1차 Reviewer인지 확인
      console.log(`🔍 GSPService: Checking approval authority...`)
      const { data: checkRecords, error: checkError } = await supabase
        .from("a_GSP_Table")
        .select(`"Reviewer 사번", 성명, "보직_STATUS", "산업전문화_STATUS", "Council_TF_STATUS", "GSP_Focus_30_STATUS"`)
        .eq("사번", normalizedEmpno)
        .order("변경요청일자", { ascending: false })
        .limit(1)
      
      const checkData = checkRecords?.[0] || null
      
      console.log(`📋 GSPService: Check data:`, checkData, `Error:`, checkError)

      if (checkError) {
        console.error("❌ GSPService: Error checking approval authority:", checkError)
        return { success: false, message: "권한 확인 중 오류가 발생했습니다." }
      }

      if (!checkData) {
        return { success: false, message: "승인 대기 중인 요청을 찾을 수 없습니다." }
      }

      // Reviewer 사번 비교 (정규화 문제 고려)
      const storedReviewerEmpno = (checkData as any)["Reviewer 사번"]
      const originalReviewerEmpno = reviewerEmpno.replace(/^0+/, '') // 앞의 0 제거

      console.log(`🔍 GSPService: Authority check - stored: ${storedReviewerEmpno}, normalized: ${normalizedReviewerEmpno}, original: ${originalReviewerEmpno}`)

      const isDirectReviewer = storedReviewerEmpno === normalizedReviewerEmpno || storedReviewerEmpno === originalReviewerEmpno

      // GSP 승인 마스터 권한 체크 (L_Reviewer_Master.can_approve_gsp = true 이면 모든 요청 승인 가능)
      let isGspApprovalMaster = false
      if (!isDirectReviewer) {
        const { data: masterCheck } = await supabase
          .from('L_Reviewer_Master')
          .select('can_approve_gsp')
          .or(`사번.eq.${normalizedReviewerEmpno},사번.eq.${originalReviewerEmpno}`)
          .limit(1)
          .maybeSingle()
        isGspApprovalMaster = masterCheck?.can_approve_gsp === true
        console.log(`🔍 GSPService: Master approval check - isGspApprovalMaster=${isGspApprovalMaster}`)
      }

      if (!isDirectReviewer && !isGspApprovalMaster) {
        return { success: false, message: "해당 요청의 승인 권한이 없습니다." }
      }

      // 모든 승인대기 중인 개별 항목들을 일괄 처리
      const updateData: any = {
        "업데이트일자": new Date().toISOString()
      }

      // 승인대기 상태인 항목들을 찾아서 업데이트
      const statusFields = ['보직_STATUS', '산업전문화_STATUS', 'Council_TF_STATUS', 'GSP_Focus_30_STATUS']
      
      statusFields.forEach(field => {
        if ((checkData as any)[field] === '승인대기') {
          updateData[field] = action
        }
      })

      console.log(`🔄 GSPService: Updating fields:`, updateData)

      let { error } = await supabase
        .from("a_GSP_Table")
        .update(updateData)
        .eq("사번", normalizedEmpno)
      
      // 정규화된 사번으로 업데이트 안 되면 원본 사번으로 시도
      if (error && error.code === 'PGRST116') { // No rows updated
        const originalEmpno = empno.replace(/^0+/, '')
        console.log(`🔄 GSPService: Trying update with original empno: ${originalEmpno}`)
        const result = await supabase
          .from("a_GSP_Table")
          .update(updateData)
          .eq("사번", originalEmpno)
        error = result.error
      }

      if (error) {
        console.error("❌ GSPService: Error updating approval status:", error)
        return {
          success: false,
          message: "승인 처리 중 오류가 발생했습니다."
        }
      }

      console.log("✅ GSPService: Approval processed successfully")
      
      // 더 친근하고 예쁜 메시지 작성
      let message: string
      if (action === '승인완료') {
        message = `🎉 ${(checkData as any).성명}님의 GSP 요청이 승인되었습니다! 멋진 목표를 세우셨네요! 💪`
      } else {
        message = `📝 ${(checkData as any).성명}님의 GSP 요청을 검토했습니다.\n더 좋은 내용으로 다시 작성해서 제출해 주세요! 😊\n언제든 도움이 필요하시면 말씀해 주세요! 💬`
      }
      
      return {
        success: true,
        message
      }
    } catch (error) {
      console.error("❌ GSPService: Error in processApproval:", error)
      return {
        success: false,
        message: "승인 처리 중 오류가 발생했습니다."
      }
    }
  }
}
