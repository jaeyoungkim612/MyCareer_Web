import { supabase } from "./supabase"

export interface GSPData {
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
  GSP: string | null
  "Forcus 30": string | null
  "Focus 30": string | null
  STATUS: string
  업데이트일자: string
  생성일자: string
  // 개별 상태 필드 추가
  "보직_STATUS"?: string
  "산업전문화_STATUS"?: string
  "Council_TF_STATUS"?: string
  "GSP_STATUS"?: string
  "Forcus_30_STATUS"?: string
  "전체_STATUS"?: string
}

export class GSPService {
  // 사용자의 GSP 입력 상태 확인
  static async checkGSPStatus(empno: string): Promise<{
    exists: boolean
    needsInput: boolean
    data?: GSPData
  }> {
    try {
      // ReviewerService import 및 사번 정규화
      const { ReviewerService } = await import("@/lib/reviewer-service")
      const normalizedEmpno = ReviewerService.normalizeEmpno(empno)
      
      console.log(`🔍 GSPService: Checking GSP status for ${empno} → ${normalizedEmpno}`)
      
      // 정규화된 사번과 원본 사번 둘 다 시도
      let { data, error } = await supabase
        .from("a_GSP_Table")
        .select("*")
        .eq("사번", normalizedEmpno)
        .maybeSingle()
      
      // 정규화된 사번으로 못 찾으면 원본 사번으로 다시 시도
      if (!data && !error) {
        const originalEmpno = empno.replace(/^0+/, '') // 앞의 0 제거
        console.log(`🔄 GSPService: Trying with original empno: ${originalEmpno}`)
        const result = await supabase
          .from("a_GSP_Table")
          .select("*")
          .eq("사번", originalEmpno)
          .maybeSingle()
        data = result.data
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
      const hasGSP = !!(data.GSP && data.GSP !== null && String(data.GSP).trim())
      const hasFocus30 = !!(data["Forcus 30"] && data["Forcus 30"] !== null && String(data["Forcus 30"]).trim())
      const has보직 = !!(data.보직 && data.보직 !== null && String(data.보직).trim())
      const has산업전문화 = !!(data.산업전문화 && data.산업전문화 !== null && String(data.산업전문화).trim())
      const hasTFCouncil = !!(data.TF_Council && data.TF_Council !== null && String(data.TF_Council).trim())
      const needsInput = (!hasGSP || !hasFocus30 || !has보직 || !has산업전문화 || !hasTFCouncil) && (data.STATUS === 'Draft' || !data.STATUS)
      
      console.log("✅ GSPService: GSP status check result:", {
        exists: true,
        needsInput,
        status: data.STATUS,
        hasGSP,
        hasFocus30,
        has보직,
        has산업전문화,
        hasTFCouncil,
        gspContent: data.GSP || "null",
        focus30Content: data["Forcus 30"] || "null",
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

  // 개별 항목 업데이트 (변경된 항목만 승인대기로 설정)
  static async updateGSPItem(empno: string, field: string, value: string): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const { ReviewerService } = await import("@/lib/reviewer-service")
      const normalizedEmpno = ReviewerService.normalizeEmpno(empno)
      
      console.log(`🔄 GSPService: Updating ${field} for ${empno} → ${normalizedEmpno}`)
      
      // 필드명과 상태 필드명 매핑
      const fieldMapping: Record<string, {dataField: string, statusField: string}> = {
        '보직': { dataField: '"보직(HC)"', statusField: '"보직_STATUS"' },
        '산업전문화': { dataField: '"산업전문화"', statusField: '"산업전문화_STATUS"' },
        'TF_Council': { dataField: '"Council/TF 등"', statusField: '"Council_TF_STATUS"' },
        'GSP': { dataField: '"GSP"', statusField: '"GSP_STATUS"' },
        'Focus30': { dataField: '"Forcus 30"', statusField: '"Forcus_30_STATUS"' }
      }
      
      const mapping = fieldMapping[field]
      if (!mapping) {
        throw new Error(`Invalid field: ${field}`)
      }
      
      const updateData: any = {
        [mapping.dataField.replace(/"/g, '')]: value,
        [mapping.statusField.replace(/"/g, '')]: '승인대기',
        "업데이트일자": new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('a_GSP_Table')
        .update(updateData)
        .eq('사번', normalizedEmpno)
        .select()
      
      if (error) {
        console.error("❌ GSPService: Error updating GSP item:", error)
        throw error
      }
      
      console.log("✅ GSPService: GSP item updated successfully:", data)
      return { success: true, message: `${field} 변경신청이 완료되었습니다.` }
    } catch (error) {
      console.error("❌ GSPService: Error in updateGSPItem:", error)
      return { success: false, message: `${field} 변경신청 중 오류가 발생했습니다.` }
    }
  }

  // GSP, Focus 30, 보직, 산업전문화, TF&Council 입력/수정 (기존 메서드 유지)
  static async updateGSP(empno: string, gsp: string, focus30: string, 보직?: string, 산업전문화?: string, tfCouncil?: string): Promise<{
    success: boolean
    message: string
  }> {
    try {
      // ReviewerService import 및 사번 정규화
      const { ReviewerService } = await import("@/lib/reviewer-service")
      const normalizedEmpno = ReviewerService.normalizeEmpno(empno)
      
      console.log(`🔄 GSPService: Updating GSP for ${empno} → ${normalizedEmpno}`)
      
      // 업데이트할 데이터 객체 생성
      const updateData: any = {
        GSP: gsp,
        "Forcus 30": focus30,
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

      console.log("✅ GSPService: GSP updated successfully")
      return {
        success: true,
        message: "GSP 정보가 성공적으로 저장되었습니다. 승인을 기다려주세요."
      }
    } catch (error) {
      console.error("❌ GSPService: Error in updateGSP:", error)
      return {
        success: false,
        message: "GSP 정보 업데이트 중 오류가 발생했습니다."
      }
    }
  }

  // 1차 Reviewer가 승인해야 할 GSP 요청 목록 조회 (수정됨)
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
      
      console.log(`🔍 GSPService: Getting pending approvals for reviewer ${reviewerEmpno} → ${normalizedReviewerEmpno}`)
      
      // 개별 항목 중 하나라도 승인대기 상태이고 현재 사용자가 1차 Reviewer인 항목들 조회
      let { data, error } = await supabase
        .from("a_GSP_Table")
        .select("*")
        .or(`"보직_STATUS".eq.승인대기,"산업전문화_STATUS".eq.승인대기,"Council_TF_STATUS".eq.승인대기,"GSP_STATUS".eq.승인대기,"Forcus_30_STATUS".eq.승인대기`)
        .eq('"Reviewer 사번"', normalizedReviewerEmpno)
      
      // 정규화된 사번으로 못 찾으면 원본 사번으로 다시 시도
      if ((!data || data.length === 0) && !error) {
        const originalReviewerEmpno = reviewerEmpno.replace(/^0+/, '') // 앞의 0 제거
        console.log(`🔄 GSPService: Trying with original reviewer empno: ${originalReviewerEmpno}`)
        const result = await supabase
          .from("a_GSP_Table")
          .select("*")
          .or(`"보직_STATUS".eq.승인대기,"산업전문화_STATUS".eq.승인대기,"Council_TF_STATUS".eq.승인대기,"GSP_STATUS".eq.승인대기,"Forcus_30_STATUS".eq.승인대기`)
          .eq('"Reviewer 사번"', originalReviewerEmpno)
        data = result.data
        error = result.error
      }

      if (error) {
        console.error("❌ GSPService: Error getting pending approvals:", error)
        return { success: false, data: [] }
      }

      if (!data || data.length === 0) {
        console.log("ℹ️ GSPService: No pending approvals found")
        return { success: true, data: [] }
      }

      // 각 사용자의 HR 정보를 별도로 조회
      const approvals = await Promise.all(data.map(async (item: any) => {
        const { ReviewerService } = await import("@/lib/reviewer-service")
        const normalizedEmpno = ReviewerService.normalizeEmpno(item.사번)
        
        // HR 정보 조회
        console.log(`🔍 GSPService: Looking up HR data for ${item.사번} → ${normalizedEmpno}`)
        
        let { data: hrData, error: hrError } = await supabase
          .from("a_hr_master")
          .select("EMPNM, ORG_NM")
          .eq("EMPNO", normalizedEmpno)
          .maybeSingle()
        
        console.log(`📋 GSPService: HR data with normalized empno:`, hrData, hrError)
        
        // 정규화된 사번으로 못 찾으면 원본 사번으로 다시 시도
        if (!hrData && !hrError) {
          const originalEmpno = item.사번.replace(/^0+/, '') // 앞의 0 제거
          console.log(`🔄 GSPService: Trying HR lookup with original empno: ${originalEmpno}`)
          const result = await supabase
            .from("a_hr_master")
            .select("EMPNM, ORG_NM")
            .eq("EMPNO", originalEmpno)
            .maybeSingle()
          hrData = result.data
          console.log(`📋 GSPService: HR data with original empno:`, hrData, result.error)
        }
        
        // 사진 정보 조회 (employee_photos 테이블에서)
        console.log(`📸 GSPService: Looking up photo for ${item.사번} → ${normalizedEmpno}`)
        
        let { data: photoData, error: photoError } = await supabase
          .from("employee_photos")
          .select("photo_url")
          .eq("empno", normalizedEmpno)
          .maybeSingle()
        
        console.log(`📸 GSPService: Photo data with normalized empno:`, photoData, photoError)
        
        // 정규화된 사번으로 못 찾으면 원본 사번으로 다시 시도
        if (!photoData && !photoError) {
          const originalEmpno = item.사번.replace(/^0+/, '') // 앞의 0 제거
          console.log(`🔄 GSPService: Trying photo lookup with original empno: ${originalEmpno}`)
          const result = await supabase
            .from("employee_photos")
            .select("photo_url")
            .eq("empno", originalEmpno)
            .maybeSingle()
          photoData = result.data
          console.log(`📸 GSPService: Photo data with original empno:`, photoData, result.error)
        }
        
        const finalData = {
          ...item,
          empnm: hrData?.EMPNM || item.성명 || "이름 없음",
          org_nm: hrData?.ORG_NM || "정보 없음",
          profile_image: photoData?.photo_url || null
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

  // 개별 항목 승인/반려 처리
  static async processItemApproval(empno: string, field: string, action: '승인완료' | '반려', reviewerEmpno: string): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const { ReviewerService } = await import("@/lib/reviewer-service")
      const normalizedEmpno = ReviewerService.normalizeEmpno(empno)
      const normalizedReviewerEmpno = ReviewerService.normalizeEmpno(reviewerEmpno)
      
      console.log(`🔄 GSPService: Processing ${action} for ${field} of ${empno} by reviewer ${reviewerEmpno}`)
      
      // 필드별 상태 컬럼 매핑
      const statusFieldMapping: Record<string, string> = {
        '보직': '"보직_STATUS"',
        '산업전문화': '"산업전문화_STATUS"',
        'TF_Council': '"Council_TF_STATUS"',
        'GSP': '"GSP_STATUS"',
        'Focus30': '"Forcus_30_STATUS"'
      }
      
      const statusField = statusFieldMapping[field]
      if (!statusField) {
        return { success: false, message: "유효하지 않은 필드입니다." }
      }
      
      // 개별 항목 상태 업데이트
      const updateData: any = {
        [statusField.replace(/"/g, '')]: action,
        "업데이트일자": new Date().toISOString()
      }
      
      const { error } = await supabase
        .from('a_GSP_Table')
        .update(updateData)
        .eq('사번', normalizedEmpno)
        .eq(statusField.replace(/"/g, ''), '승인대기')
      
      if (error) {
        console.error("❌ GSPService: Error updating item approval status:", error)
        return { success: false, message: `${field} 승인 처리 중 오류가 발생했습니다.` }
      }
      
      console.log(`✅ GSPService: ${field} approval processed successfully`)
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
      const { data: checkData, error: checkError } = await supabase
        .from("a_GSP_Table")
        .select(`"Reviewer 사번", 성명, "보직_STATUS", "산업전문화_STATUS", "Council_TF_STATUS", "GSP_STATUS", "Forcus_30_STATUS"`)
        .eq("사번", normalizedEmpno)
        .maybeSingle()
      
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
      
      if (storedReviewerEmpno !== normalizedReviewerEmpno && storedReviewerEmpno !== originalReviewerEmpno) {
        return { success: false, message: "해당 요청의 승인 권한이 없습니다." }
      }

      // 모든 승인대기 중인 개별 항목들을 일괄 처리
      const updateData: any = {
        "업데이트일자": new Date().toISOString()
      }

      // 승인대기 상태인 항목들을 찾아서 업데이트
      const statusFields = ['보직_STATUS', '산업전문화_STATUS', 'Council_TF_STATUS', 'GSP_STATUS', 'Forcus_30_STATUS']
      
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
