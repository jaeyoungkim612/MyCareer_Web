-- HR Master 테이블 생성 (Full Refresh)
DROP TABLE IF EXISTS a_hr_master;

CREATE TABLE a_hr_master (
    "EMPNO" text PRIMARY KEY,
    "EMPNM" text,
    "CM_NM" text,
    "GRADCD" text,
    "TL_EMPNO" text,
    "POS_YMD" text,
    "JOB_INFO_NM" text,
    "CM_CD" text,
    "EMP_STAT" text,
    "WORK_TYPE_NM" text,
    "ETL_DATE" date,
    "CREATED_DATE" timestamp DEFAULT NOW(),
    "PWC_ID" text,
    "LICENSE_CD" text,
    "LICENSE_NM" text,
    "GRADNM" text,
    "COMPANY_NM" text,
    "LOS" text,
    "ORG_CD" text,
    "ORG_NM" text,
    "JOB_GROUP_NM" text,
    "ENG_NM" text
);

-- RLS 설정
ALTER TABLE a_hr_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access for hr master" ON a_hr_master;
CREATE POLICY "Allow all access for hr master" ON a_hr_master FOR ALL USING (true);

-- 샘플 직원 데이터 삽입
INSERT INTO a_hr_master (
    "EMPNO", "EMPNM", "CM_NM", "GRADCD", "GRADNM", "COMPANY_NM", 
    "ORG_CD", "ORG_NM", "JOB_GROUP_NM", "EMP_STAT"
) VALUES 
('EMP001', '김철수', '소속', 'G5', 'Senior Associate', 'PwC Korea', 
 'ASS001', 'Assurance DA', 'Assurance', 'Active'),
('EMP002', '이영희', '보직(HC)', 'G6', 'Manager', 'PwC Korea', 
 'HC001', 'Human Capital', 'Advisory', 'Active'),
('EMP003', '박민수', '산업전문화', 'G4', 'Associate', 'PwC Korea', 
 'TMT001', 'Technology, Media & Telecom (TMT)', 'Advisory', 'Active'),
('EMP004', '정수진', 'TF & Council', 'G7', 'Senior Manager', 'PwC Korea', 
 'DIG001', '디지털 Council', 'Digital', 'Active'),
('EMP005', '최동훈', 'GSP', 'G8', 'Director', 'PwC Korea', 
 'GSP001', 'Global Strategic Projects', 'Strategy', 'Active');

-- 테이블 생성 확인
SELECT 'HR Master table created successfully' as status;
SELECT COUNT(*) as total_employees FROM a_hr_master;

-- 테이블 상태 확인
SELECT 'HR Master table configured successfully' as status;
SELECT COUNT(*) as total_employees FROM a_hr_master WHERE "EMP_STAT" = '재직';
SELECT "EMPNO", "EMPNM", "CM_NM", "GRADCD", "ORG_NM" FROM a_hr_master WHERE "EMP_STAT" = '재직' LIMIT 10;
