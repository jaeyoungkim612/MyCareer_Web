-- Supabase용 안전한 a_GSP_Table 히스토리 관리 설정

-- 1단계: 기존 제약 조건 확인 및 제거 (필요시)
DO $$
BEGIN
    -- 외래 키 제약 조건이 이미 존재하면 건너뛰기
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_previous_record' 
        AND table_name = 'a_GSP_Table'
    ) THEN
        RAISE NOTICE '외래 키 제약 조건이 이미 존재합니다.';
    ELSE
        -- 외래 키 제약 조건 추가
        ALTER TABLE "a_GSP_Table" 
        ADD CONSTRAINT fk_previous_record 
        FOREIGN KEY ("이전_레코드_ID") REFERENCES "a_GSP_Table"("ID");
        RAISE NOTICE '외래 키 제약 조건을 추가했습니다.';
    END IF;
END $$;

-- 2단계: 인덱스 안전하게 생성 (이미 존재하면 건너뛰기)
CREATE INDEX IF NOT EXISTS idx_gsp_table_id ON "a_GSP_Table"("ID");
CREATE INDEX IF NOT EXISTS idx_gsp_table_empno_date ON "a_GSP_Table"("사번", "변경요청일자" DESC);
CREATE INDEX IF NOT EXISTS idx_gsp_table_empno_status ON "a_GSP_Table"("사번", "보직_STATUS", "산업전문화_STATUS", "Council_TF_STATUS", "GSP_Focus_30_STATUS");
CREATE INDEX IF NOT EXISTS idx_gsp_table_reviewer_status ON "a_GSP_Table"("Reviewer 사번", "보직_STATUS", "산업전문화_STATUS", "Council_TF_STATUS", "GSP_Focus_30_STATUS");

-- 3단계: 최신 레코드 조회를 위한 뷰 안전하게 생성
DROP VIEW IF EXISTS "v_GSP_Latest";
CREATE VIEW "v_GSP_Latest" AS
WITH latest_records AS (
    SELECT 
        "사번",
        MAX("변경요청일자") as latest_date
    FROM "a_GSP_Table"
    GROUP BY "사번"
)
SELECT g.*
FROM "a_GSP_Table" g
INNER JOIN latest_records l ON g."사번" = l."사번" AND g."변경요청일자" = l.latest_date;

-- 4단계: 히스토리 조회를 위한 뷰 안전하게 생성
DROP VIEW IF EXISTS "v_GSP_History";
CREATE VIEW "v_GSP_History" AS
SELECT 
    "ID",
    "사번",
    "성명",
    "변경요청일자",
    "처리일자",
    "이전_레코드_ID",
    "버전",
    
    -- 변경된 항목들을 JSON 형태로 정리
    jsonb_build_object(
        '보직', jsonb_build_object('값', "보직(HC)", '상태', "보직_STATUS"),
        '산업전문화', jsonb_build_object('값', "산업전문화", '상태', "산업전문화_STATUS"),
        'Council_TF', jsonb_build_object('값', "Council/TF 등", '상태', "Council_TF_STATUS"),
        'GSP_Focus30', jsonb_build_object('값', "GSP/Focus 30", '상태', "GSP_Focus_30_STATUS")
    ) as 변경내역
    
FROM "a_GSP_Table"
ORDER BY "사번", "변경요청일자" DESC;

-- 5단계: 최신 데이터 조회 함수 안전하게 생성
DROP FUNCTION IF EXISTS get_latest_gsp_data(text);
CREATE OR REPLACE FUNCTION get_latest_gsp_data(emp_no text)
RETURNS TABLE(
    id integer,
    empno text,
    name text,
    job_info text,
    job_status text,
    industry_spec text,
    industry_status text,
    council_tf text,
    council_status text,
    gsp_focus30 text,
    gsp_status text,
    request_date timestamp,
    process_date timestamp
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g."ID",
        g."사번",
        g."성명",
        g."보직(HC)",
        g."보직_STATUS",
        g."산업전문화",
        g."산업전문화_STATUS",
        g."Council/TF 등",
        g."Council_TF_STATUS",
        g."GSP/Focus 30",
        g."GSP_Focus_30_STATUS",
        g."변경요청일자",
        g."처리일자"
    FROM "a_GSP_Table" g
    WHERE g."사번" = LPAD(emp_no, 6, '0')
    ORDER BY g."변경요청일자" DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 6단계: 데이터 검증 쿼리
SELECT 
    '테이블 레코드 수' as 구분,
    COUNT(*)::text as 값
FROM "a_GSP_Table"

UNION ALL

SELECT 
    '고유 사번 수' as 구분,
    COUNT(DISTINCT "사번")::text as 값
FROM "a_GSP_Table"

UNION ALL

SELECT 
    '인덱스 수' as 구분,
    COUNT(*)::text as 값
FROM pg_indexes 
WHERE tablename = 'a_GSP_Table'

UNION ALL

SELECT 
    '제약 조건 수' as 구분,
    COUNT(*)::text as 값
FROM information_schema.table_constraints 
WHERE table_name = 'a_GSP_Table';

-- 7단계: 최신 데이터 샘플 조회
SELECT 
    "ID",
    "사번", 
    "성명", 
    "GSP/Focus 30",
    "GSP_Focus_30_STATUS",
    "변경요청일자",
    "처리일자",
    "버전"
FROM "a_GSP_Table" 
ORDER BY "사번", "변경요청일자" DESC
LIMIT 10;

-- 8단계: 뷰 작동 확인
SELECT COUNT(*) as "v_GSP_Latest_레코드수" FROM "v_GSP_Latest";
SELECT COUNT(*) as "v_GSP_History_레코드수" FROM "v_GSP_History";

-- 9단계: 함수 테스트 (예시 사번으로)
-- SELECT * FROM get_latest_gsp_data('210381');

-- 완료 메시지
SELECT '✅ a_GSP_Table 히스토리 관리 설정이 완료되었습니다!' as 완료상태;
