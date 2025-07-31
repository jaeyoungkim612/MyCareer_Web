-- Self Assessment Scores 테이블 생성 (히스토리 버전)
DROP TABLE IF EXISTS self_assessment_scores;

CREATE TABLE self_assessment_scores (
  id BIGSERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  business_current DECIMAL(3,1) DEFAULT 0.0,
  business_target DECIMAL(3,1) DEFAULT 0.0,
  people_current DECIMAL(3,1) DEFAULT 0.0,
  people_target DECIMAL(3,1) DEFAULT 0.0,
  collaboration_current DECIMAL(3,1) DEFAULT 0.0,
  collaboration_target DECIMAL(3,1) DEFAULT 0.0,
  quality_current DECIMAL(3,1) DEFAULT 0.0,
  quality_target DECIMAL(3,1) DEFAULT 0.0,
  industry_current DECIMAL(3,1) DEFAULT 0.0,
  industry_target DECIMAL(3,1) DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- UNIQUE 제약조건 제거하여 히스토리 유지 가능
);

-- RLS 설정
ALTER TABLE self_assessment_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access for assessment scores" ON self_assessment_scores;
CREATE POLICY "Allow all access for assessment scores" ON self_assessment_scores FOR ALL USING (true);

-- 초기 더미 데이터 삽입
INSERT INTO self_assessment_scores (
  employee_id,
  business_current, business_target,
  people_current, people_target,
  collaboration_current, collaboration_target,
  quality_current, quality_target,
  industry_current, industry_target
) VALUES (
  'EMP001',
  7.5, 8.5,  -- Business
  6.8, 8.0,  -- People  
  7.2, 8.2,  -- Collaboration
  6.5, 7.8,  -- Quality
  7.0, 8.3   -- Industry
);

-- 테이블 생성 확인
SELECT 'Self Assessment Scores table created successfully with history support' as status;

-- 데이터 확인
SELECT * FROM self_assessment_scores WHERE employee_id = 'EMP001' ORDER BY created_at DESC;
