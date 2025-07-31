-- 기존 테이블 삭제 후 재생성 (UNIQUE 제약조건 제거)
DROP TABLE IF EXISTS business_goals;

-- Business Goals 테이블 생성 (히스토리 유지를 위해 UNIQUE 제약조건 제거)
CREATE TABLE business_goals (
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
CREATE INDEX idx_business_goals_employee_id ON business_goals(employee_id);
CREATE INDEX idx_business_goals_created_at ON business_goals(employee_id, created_at DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE business_goals ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Allow all access for now" ON business_goals;
CREATE POLICY "Allow all access for now" ON business_goals
  FOR ALL USING (true);

-- 초기 더미 데이터 삽입 (첫 번째 버전)
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
  non_audit_adjusted_em,
  created_at
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
  75,
  NOW() - INTERVAL '1 hour'
);

-- 두 번째 버전 (1시간 후 업데이트된 것처럼)
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
  non_audit_adjusted_em,
  created_at
) VALUES (
  'EMP001',
  '2024년 비즈니스 목표: 신규 고객 확보 및 매출 증대 (수정됨)',
  7,
  500000000,
  150000,
  3,
  200000000,
  120000,
  85,
  75,
  NOW() - INTERVAL '30 minutes'
);

-- 테이블 생성 확인
SELECT 'Business Goals table created successfully with history support' as status;

-- 데이터 확인 (히스토리 순서대로)
SELECT id, employee_id, new_audit_count, created_at 
FROM business_goals 
WHERE employee_id = 'EMP001' 
ORDER BY created_at DESC;
