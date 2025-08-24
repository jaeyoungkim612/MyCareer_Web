// hr_master_dashboard 뷰 타입 정의

export interface HrMasterDashboardRow {
  EMPNO: string
  EMPNM: string
  CM_NM: string
  TL_EMPNO: string
  JOB_INFO_NM: string
  GRADNM: string
  PWC_ID: string
  ORG_NM: string
  COMPANY_NM: string
  JOB_GROUP_NM: string
  ENG_NM: string
  audit_pjt_count: number
  audit_pjt_amount: number
  non_audit_pjt_count: number
  non_audit_pjt_amount: number
  partner_tl: string
  industry_specialization: string
  internal_function: string
  council_tf: string
  grp: string
  external_activity: string
  innovation_case: string
  award_history: string
  budget_audit: number
  budget_non_audit: number
  total_pjt_count: number
  total_pjt_amount: number
  // 추가된 실적 관련 컬럼들
  current_audit_revenue: number
  current_audit_adjusted_em: number
  current_non_audit_revenue: number
  current_non_audit_adjusted_em: number
  total_current_revenue: number
  total_current_adjusted_em: number
  // 본부 집계 컬럼 추가
  dept_budget_audit: number
  dept_budget_non_audit: number
  dept_revenue_audit: number
  dept_revenue_non_audit: number
  // BACKLOG 및 파이프라인 관련 컬럼 추가 (hr_master_dashboard 뷰 업데이트 후)
  current_audit_backlog?: number
  current_non_audit_backlog?: number
  pipeline_current_total?: number
  total_current_backlog?: number
  dept_backlog_audit?: number
  dept_backlog_non_audit?: number
  dept_pipeline_current_total?: number
  // AUDITYN 구분된 파이프라인 컬럼들 추가
  pipeline_audit_current_total?: number
  pipeline_non_audit_current_total?: number
  dept_pipeline_audit_current_total?: number
  dept_pipeline_non_audit_current_total?: number
} 