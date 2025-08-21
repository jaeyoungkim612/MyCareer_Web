-- 1. 기존 테이블 완전 삭제
DROP TABLE IF EXISTS quality_non_audit_performance CASCADE;

-- 2. 새로운 구조의 테이블 생성
CREATE TABLE quality_non_audit_performance (
    id BIGSERIAL PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    type VARCHAR(10) NOT NULL,
    quality_goal TEXT,
    
    -- 4개 평가 항목 컬럼
    year_end_time_ratio INTEGER DEFAULT 0,         -- Year End 이전 시간 비율 (퍼센트, 정수)
    el_input_hours INTEGER DEFAULT 0,              -- EL 투입시간 (시간 단위, 정수)
    ax_transition_ratio INTEGER DEFAULT 0,         -- AX/DX Transition 비율 (퍼센트, 정수)
    eer_evaluation_score TEXT DEFAULT 'Compliant', -- EER 평가 결과 (기본값: "Compliant")
    
    goal_text TEXT,
    status quality_performance_status DEFAULT 'Draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT check_type CHECK (type IN ('신규', '기존', 'none')),
    CONSTRAINT check_year_end_ratio CHECK (year_end_time_ratio >= 0 AND year_end_time_ratio <= 100),
    CONSTRAINT check_el_hours CHECK (el_input_hours >= 0),
    CONSTRAINT check_ax_ratio CHECK (ax_transition_ratio >= 0 AND ax_transition_ratio <= 100),
    CONSTRAINT check_eer_score CHECK (eer_evaluation_score IN ('Compliant', 'Non-Compliant', 'Pending'))
);

-- 3. quality_performance_status ENUM 생성 (없으면)
DO $$ 
BEGIN
    CREATE TYPE quality_performance_status AS ENUM ('Draft', '작성중', '완료');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. RLS 정책 설정
ALTER TABLE quality_non_audit_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access for now" ON quality_non_audit_performance FOR ALL USING (true);

-- 5. 인덱스 추가
CREATE INDEX idx_quality_plan_employee_id ON quality_non_audit_performance(employee_id);
CREATE INDEX idx_quality_plan_employee_type_created ON quality_non_audit_performance(employee_id, type, created_at DESC);
CREATE INDEX idx_quality_plan_employee_status ON quality_non_audit_performance(employee_id, status);

-- 6. 새로운 평가 항목별 인덱스 (필요시)
CREATE INDEX idx_quality_plan_year_end_ratio ON quality_non_audit_performance(year_end_time_ratio) WHERE year_end_time_ratio > 0;
CREATE INDEX idx_quality_plan_eer_score ON quality_non_audit_performance(eer_evaluation_score) WHERE eer_evaluation_score != 'Compliant';

-- 7. 테이블 구조 확인
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'quality_non_audit_performance' 
ORDER BY ordinal_position;

-- 8. 제약조건 확인
SELECT 
    tc.constraint_name, 
    tc.constraint_type, 
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'quality_non_audit_performance';

-- 9. 샘플 데이터 확인용 쿼리
SELECT 
    employee_id,
    type,
    quality_goal,
    year_end_time_ratio,
    el_input_hours,
    ax_transition_ratio,
    eer_evaluation_score,
    status,
    created_at
FROM quality_non_audit_performance 
ORDER BY employee_id, created_at DESC;
