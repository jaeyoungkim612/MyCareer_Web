-- Business Goals 테이블 생성
CREATE TABLE IF NOT EXISTS business_goals (
  id BIGSERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  business_goal TEXT NOT NULL,
  new_audit_count INTEGER DEFAULT 0,
  new_audit_amount BIGINT DEFAULT 0,
  hourly_revenue INTEGER DEFAULT 0,
  ui_revenue_count INTEGER DEFAULT 0,
  ui_revenue_amount BIGINT DEFAULT 0,
  non_audit_hourly_revenue INTEGER DEFAULT 0,
  audit_adjusted_em INTEGER DEFAULT 0,
  non_audit_adjusted_em INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_business_goals_employee_id ON business_goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_business_goals_created_at ON business_goals(created_at DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE business_goals ENABLE ROW LEVEL SECURITY;

-- 정책 생성 (임시로 모든 사용자 접근 허용 - 인증 구현 전까지)
CREATE POLICY "Allow all access for now" ON business_goals
  FOR ALL USING (true);
