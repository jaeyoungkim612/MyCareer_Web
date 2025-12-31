-- Business Mid Assessments 테이블 생성
DROP TABLE IF EXISTS business_mid_assessments CASCADE;

CREATE TABLE business_mid_assessments (
  id BIGSERIAL PRIMARY KEY,
  empno VARCHAR(50) NOT NULL UNIQUE,
  comment TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business Final Assessments 테이블 생성
DROP TABLE IF EXISTS business_final_assessments CASCADE;

CREATE TABLE business_final_assessments (
  id BIGSERIAL PRIMARY KEY,
  empno VARCHAR(50) NOT NULL UNIQUE,
  comment TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 설정: Mid Assessments
ALTER TABLE business_mid_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access for business mid assessments" ON business_mid_assessments;
CREATE POLICY "Allow all access for business mid assessments" 
  ON business_mid_assessments 
  FOR ALL 
  USING (true);

-- RLS 설정: Final Assessments
ALTER TABLE business_final_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access for business final assessments" ON business_final_assessments;
CREATE POLICY "Allow all access for business final assessments" 
  ON business_final_assessments 
  FOR ALL 
  USING (true);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_business_mid_assessments_empno ON business_mid_assessments(empno);
CREATE INDEX IF NOT EXISTS idx_business_mid_assessments_status ON business_mid_assessments(status);
CREATE INDEX IF NOT EXISTS idx_business_final_assessments_empno ON business_final_assessments(empno);
CREATE INDEX IF NOT EXISTS idx_business_final_assessments_status ON business_final_assessments(status);

-- 테이블 생성 확인
SELECT 'Business Mid Assessments table created successfully' as status;
SELECT 'Business Final Assessments table created successfully' as status;

-- 테이블 구조 확인
\d business_mid_assessments
\d business_final_assessments

