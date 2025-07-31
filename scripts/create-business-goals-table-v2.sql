-- 기존 테이블 삭제 후 재생성
DROP TABLE IF EXISTS business_goals;

-- Business Goals 테이블 생성 (UNIQUE 제약조건 포함)
CREATE TABLE business_goals (
  id BIGSERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL UNIQUE,
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
CREATE INDEX idx_business_goals_employee_id ON business_goals(employee_id);
CREATE INDEX idx_business_goals_created_at ON business_goals(created_at DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE business_goals ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Allow all access for now" ON business_goals;
CREATE POLICY "Allow all access for now" ON business_goals
  FOR ALL USING (true);

-- 초기 더미 데이터 삽입
INSERT INTO business_goals (
  employee_id,
  business_goal,
  new_audit_count,
  new_audit_amount,
  hourly_revenue,
  ui_revenue_count,
  ui_revenue_amount,
  non_audit_hourly_revenue,
  audit_adjusted_em,
  non_audit_adjusted_em
) VALUES (
  'EMP001',
  '2024년 비즈니스 목표: 신규 고객 확보 및 매출 증대',
  5,
  500000000,
  150000,
  3,
  200000000,
  120000,
  85,
  75
) ON CONFLICT (employee_id) DO NOTHING;

-- 테이블 생성 확인
SELECT 'Business Goals table created successfully with UNIQUE constraint' as status;

-- 데이터 확인
SELECT * FROM business_goals WHERE employee_id = 'EMP001';
