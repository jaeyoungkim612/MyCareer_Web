-- =================================================================
-- a_GSP_Table 히스토리 관리 완전 설정 스크립트 (Supabase용)
-- 기존 제약조건/인덱스/뷰가 있어도 안전하게 실행 가능
-- 매번 실행 시 L_직무및활동 테이블 데이터로 초기화
-- =================================================================

-- 1단계: a_GSP_Table 데이터 초기화 (L_직무및활동 기준)
DO $$
DECLARE
    total_count INTEGER := 0;
    inserted_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔄 a_GSP_Table 데이터 초기화 시작 (L_직무및활동 기준)...';
    
    -- 기존 a_GSP_Table 데이터 완전 삭제
    DELETE FROM "a_GSP_Table";
    RAISE NOTICE '✅ 기존 a_GSP_Table 데이터를 모두 삭제했습니다.';
    
    -- L_직무및활동 + L_Reviewer 조인하여 리뷰어 정보와 함께 a_GSP_Table 초기화
    INSERT INTO "a_GSP_Table" (
        "NO",
        "사번",
        "성명",
        "FY26 팀명",
        "Reviewer 사번",
        "1차 Reviewer",
        "보직(HC)",
        "보직_STATUS",
        "산업전문화",
        "산업전문화_STATUS",
        "Council/TF 등",
        "Council_TF_STATUS",
        "GSP/Focus 30",
        "GSP_Focus_30_STATUS",
        "생성일자",
        "업데이트일자"
    )
    SELECT 
        ROW_NUMBER() OVER (ORDER BY j."사번") as "NO",  -- 일련번호 생성
        LPAD(j."사번", 6, '0') as "사번",  -- 6자리로 정규화
        j."파트너명" as "성명",
        COALESCE(r."FY26 팀명", '') as "FY26 팀명",
        
        -- L_Reviewer 테이블에서 리뷰어 정보 가져오기
        COALESCE(r."Reviewer 사번", '') as "Reviewer 사번",
        COALESCE(r."1차 Reviewer", '') as "1차 Reviewer",
        
        COALESCE(j."보직", '') as "보직(HC)",
        '승인완료' as "보직_STATUS",
        COALESCE(j."산업전문화", '') as "산업전문화",
        '승인완료' as "산업전문화_STATUS",
        COALESCE(j."Council/TF 등", '') as "Council/TF 등",
        '승인완료' as "Council_TF_STATUS",
        COALESCE(j."GSP/Focus 30", '') as "GSP/Focus 30",
        '승인완료' as "GSP_Focus_30_STATUS",
        CURRENT_TIMESTAMP as "생성일자",
        CURRENT_TIMESTAMP as "업데이트일자"
    FROM "L_직무및활동" j
    LEFT JOIN "L_Reviewer" r ON LPAD(j."사번", 6, '0') = LPAD(r."사번", 6, '0')
    WHERE j."사번" IS NOT NULL 
      AND j."사번" != ''
      AND j."파트너명" IS NOT NULL
      AND j."파트너명" != '';
    
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    
    SELECT COUNT(*) INTO total_count FROM "a_GSP_Table";
    
    RAISE NOTICE '✅ L_직무및활동에서 % 명의 데이터로 a_GSP_Table을 초기화했습니다.', inserted_count;
    RAISE NOTICE '🎯 현재 a_GSP_Table 총 레코드 수: %', total_count;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ a_GSP_Table 초기화 중 오류: %', SQLERRM;
END $$;

-- 2단계: 기존 제약조건 안전하게 제거 후 재생성
DO $$
BEGIN
    -- 기존 외래 키 제약조건 제거
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_previous_record' 
        AND table_name = 'a_GSP_Table'
    ) THEN
        ALTER TABLE "a_GSP_Table" DROP CONSTRAINT fk_previous_record;
        RAISE NOTICE '✅ 기존 외래 키 제약조건을 제거했습니다.';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ 제약조건 제거 중 오류 (무시): %', SQLERRM;
END $$;

-- 2단계: 기존 인덱스 안전하게 제거
DO $$
DECLARE
    index_name TEXT;
BEGIN
    FOR index_name IN 
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'a_GSP_Table' 
        AND indexname IN ('idx_gsp_table_id', 'idx_gsp_table_empno_date', 'idx_gsp_table_empno_status', 'idx_gsp_table_reviewer_status')
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(index_name);
        RAISE NOTICE '✅ 기존 인덱스 % 를 제거했습니다.', index_name;
    END LOOP;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ 인덱스 제거 중 오류 (무시): %', SQLERRM;
END $$;

-- 3단계: 기존 뷰 안전하게 제거
DO $$
BEGIN
    DROP VIEW IF EXISTS "v_GSP_Latest" CASCADE;
    DROP VIEW IF EXISTS "v_GSP_History" CASCADE;
    RAISE NOTICE '✅ 기존 뷰들을 제거했습니다.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ 뷰 제거 중 오류 (무시): %', SQLERRM;
END $$;

-- 4단계: 기존 함수 안전하게 제거
DO $$
BEGIN
    DROP FUNCTION IF EXISTS get_latest_gsp_data(text) CASCADE;
    RAISE NOTICE '✅ 기존 함수를 제거했습니다.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ 함수 제거 중 오류 (무시): %', SQLERRM;
END $$;

-- 5단계: 테이블에 히스토리 관리 컬럼 추가
DO $$
BEGIN
    -- ID 컬럼 추가 (SERIAL PRIMARY KEY)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a_GSP_Table' AND column_name = 'ID'
    ) THEN
        ALTER TABLE "a_GSP_Table" ADD COLUMN "ID" SERIAL PRIMARY KEY;
        RAISE NOTICE '✅ ID 컬럼을 추가했습니다.';
    ELSE
        RAISE NOTICE '⚠️ ID 컬럼이 이미 존재합니다.';
    END IF;

    -- 변경요청일자 컬럼 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a_GSP_Table' AND column_name = '변경요청일자'
    ) THEN
        ALTER TABLE "a_GSP_Table" ADD COLUMN "변경요청일자" timestamp DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ 변경요청일자 컬럼을 추가했습니다.';
    ELSE
        RAISE NOTICE '⚠️ 변경요청일자 컬럼이 이미 존재합니다.';
    END IF;

    -- 처리일자 컬럼 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a_GSP_Table' AND column_name = '처리일자'
    ) THEN
        ALTER TABLE "a_GSP_Table" ADD COLUMN "처리일자" timestamp;
        RAISE NOTICE '✅ 처리일자 컬럼을 추가했습니다.';
    ELSE
        RAISE NOTICE '⚠️ 처리일자 컬럼이 이미 존재합니다.';
    END IF;

    -- 이전_레코드_ID 컬럼 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a_GSP_Table' AND column_name = '이전_레코드_ID'
    ) THEN
        ALTER TABLE "a_GSP_Table" ADD COLUMN "이전_레코드_ID" integer;
        RAISE NOTICE '✅ 이전_레코드_ID 컬럼을 추가했습니다.';
    ELSE
        RAISE NOTICE '⚠️ 이전_레코드_ID 컬럼이 이미 존재합니다.';
    END IF;

    -- 버전 컬럼 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a_GSP_Table' AND column_name = '버전'
    ) THEN
        ALTER TABLE "a_GSP_Table" ADD COLUMN "버전" integer DEFAULT 1;
        RAISE NOTICE '✅ 버전 컬럼을 추가했습니다.';
    ELSE
        RAISE NOTICE '⚠️ 버전 컬럼이 이미 존재합니다.';
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ 컬럼 추가 중 오류: %', SQLERRM;
END $$;

-- 6단계: 기존 데이터에 기본값 설정
DO $$
BEGIN
    -- 변경요청일자 기본값 설정
    UPDATE "a_GSP_Table" 
    SET "변경요청일자" = COALESCE("업데이트일자", "생성일자", CURRENT_TIMESTAMP)
    WHERE "변경요청일자" IS NULL;
    
    RAISE NOTICE '✅ 변경요청일자 기본값을 설정했습니다.';

    -- 승인완료된 항목들의 처리일자 설정
    UPDATE "a_GSP_Table" 
    SET "처리일자" = "변경요청일자"
    WHERE ("보직_STATUS" = '승인완료' OR "산업전문화_STATUS" = '승인완료' OR 
           "Council_TF_STATUS" = '승인완료' OR "GSP_Focus_30_STATUS" = '승인완료')
      AND "처리일자" IS NULL;
    
    RAISE NOTICE '✅ 승인완료 항목의 처리일자를 설정했습니다.';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ 기본값 설정 중 오류: %', SQLERRM;
END $$;

-- 7단계: 초기화 완료 확인
DO $$
DECLARE
    record_count INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO record_count FROM "a_GSP_Table";
    RAISE NOTICE '✅ 초기화 완료! 현재 a_GSP_Table 레코드 수: %', record_count;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ 초기화 확인 중 오류: %', SQLERRM;
END $$;

-- 8단계: 성능 인덱스 생성
DO $$
BEGIN
    CREATE INDEX idx_gsp_table_id ON "a_GSP_Table"("ID");
    RAISE NOTICE '✅ ID 인덱스를 생성했습니다.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ ID 인덱스 생성 오류 (무시): %', SQLERRM;
END $$;

DO $$
BEGIN
    CREATE INDEX idx_gsp_table_empno_date ON "a_GSP_Table"("사번", "변경요청일자" DESC);
    RAISE NOTICE '✅ 사번-날짜 인덱스를 생성했습니다.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ 사번-날짜 인덱스 생성 오류 (무시): %', SQLERRM;
END $$;

DO $$
BEGIN
    CREATE INDEX idx_gsp_table_empno_status ON "a_GSP_Table"("사번", "보직_STATUS", "산업전문화_STATUS", "Council_TF_STATUS", "GSP_Focus_30_STATUS");
    RAISE NOTICE '✅ 사번-상태 인덱스를 생성했습니다.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ 사번-상태 인덱스 생성 오류 (무시): %', SQLERRM;
END $$;

DO $$
BEGIN
    CREATE INDEX idx_gsp_table_reviewer_status ON "a_GSP_Table"("Reviewer 사번", "보직_STATUS", "산업전문화_STATUS", "Council_TF_STATUS", "GSP_Focus_30_STATUS");
    RAISE NOTICE '✅ 리뷰어-상태 인덱스를 생성했습니다.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ 리뷰어-상태 인덱스 생성 오류 (무시): %', SQLERRM;
END $$;

-- 9단계: 외래 키 제약조건 생성
DO $$
BEGIN
    ALTER TABLE "a_GSP_Table" 
    ADD CONSTRAINT fk_previous_record 
    FOREIGN KEY ("이전_레코드_ID") REFERENCES "a_GSP_Table"("ID");
    
    RAISE NOTICE '✅ 외래 키 제약조건을 생성했습니다.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ 외래 키 제약조건 생성 오류 (무시): %', SQLERRM;
END $$;

-- 10단계: 최신 레코드 조회 뷰 생성
DO $$
BEGIN
    EXECUTE '
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
    INNER JOIN latest_records l ON g."사번" = l."사번" AND g."변경요청일자" = l.latest_date';
    
    RAISE NOTICE '✅ v_GSP_Latest 뷰를 생성했습니다.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ v_GSP_Latest 뷰 생성 오류: %', SQLERRM;
END $$;

-- 11단계: 히스토리 조회 뷰 생성
DO $$
BEGIN
    EXECUTE '
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
            ''보직'', jsonb_build_object(''값'', "보직(HC)", ''상태'', "보직_STATUS"),
            ''산업전문화'', jsonb_build_object(''값'', "산업전문화", ''상태'', "산업전문화_STATUS"),
            ''Council_TF'', jsonb_build_object(''값'', "Council/TF 등", ''상태'', "Council_TF_STATUS"),
            ''GSP_Focus30'', jsonb_build_object(''값'', "GSP/Focus 30", ''상태'', "GSP_Focus_30_STATUS")
        ) as 변경내역
        
    FROM "a_GSP_Table"
    ORDER BY "사번", "변경요청일자" DESC';
    
    RAISE NOTICE '✅ v_GSP_History 뷰를 생성했습니다.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ v_GSP_History 뷰 생성 오류: %', SQLERRM;
END $$;

-- 12단계: 최신 데이터 조회 함수 생성
DO $$
BEGIN
    EXECUTE '
    CREATE FUNCTION get_latest_gsp_data(emp_no text)
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
    ) AS $func$
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
        WHERE g."사번" = LPAD(emp_no, 6, ''0'')
        ORDER BY g."변경요청일자" DESC
        LIMIT 1;
    END;
    $func$ LANGUAGE plpgsql';
    
    RAISE NOTICE '✅ get_latest_gsp_data 함수를 생성했습니다.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ get_latest_gsp_data 함수 생성 오류: %', SQLERRM;
END $$;

-- 13단계: 데이터 검증 및 상태 확인
SELECT 
    '📊 테이블 레코드 수' as 구분,
    COUNT(*)::text as 값
FROM "a_GSP_Table"

UNION ALL

SELECT 
    '👥 고유 사번 수' as 구분,
    COUNT(DISTINCT "사번")::text as 값
FROM "a_GSP_Table"

UNION ALL

SELECT 
    '🔍 인덱스 수' as 구분,
    COUNT(*)::text as 값
FROM pg_indexes 
WHERE tablename = 'a_GSP_Table'

UNION ALL

SELECT 
    '🔗 제약 조건 수' as 구분,
    COUNT(*)::text as 값
FROM information_schema.table_constraints 
WHERE table_name = 'a_GSP_Table'

UNION ALL

SELECT 
    '👀 뷰 수' as 구분,
    COUNT(*)::text as 값
FROM information_schema.views 
WHERE table_name LIKE 'v_GSP_%'

UNION ALL

SELECT 
    '⚙️ 함수 수' as 구분,
    COUNT(*)::text as 값
FROM information_schema.routines 
WHERE routine_name = 'get_latest_gsp_data';

-- 14단계: 중복 데이터 확인
SELECT 
    '🔍 중복 데이터 확인' as 제목,
    "사번", 
    COUNT(*) as 레코드수
FROM "a_GSP_Table"
GROUP BY "사번"
HAVING COUNT(*) > 1
ORDER BY 레코드수 DESC
LIMIT 5;

-- 15단계: 최종 샘플 데이터 확인
SELECT 
    '📋 최신 데이터 샘플' as 제목,
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

-- 16단계: 뷰 작동 확인
SELECT 
    '🎯 뷰 작동 확인' as 제목,
    'v_GSP_Latest' as 뷰명,
    COUNT(*)::text as 레코드수
FROM "v_GSP_Latest"

UNION ALL

SELECT 
    '🎯 뷰 작동 확인' as 제목,
    'v_GSP_History' as 뷰명,
    COUNT(*)::text as 레코드수
FROM "v_GSP_History";

-- 17단계: 완료 메시지
SELECT 
    '🎉🎉🎉 a_GSP_Table 히스토리 관리 설정이 완전히 완료되었습니다! 🎉🎉🎉' as "✅ 완료 상태",
    '이제 안전하게 GSP 데이터를 관리할 수 있습니다.' as "📝 참고사항";

-- =================================================================
-- 사용 예시:
-- SELECT * FROM get_latest_gsp_data('210381');
-- SELECT * FROM "v_GSP_Latest" WHERE "사번" = '210381';
-- SELECT * FROM "v_GSP_History" WHERE "사번" = '210381';
-- =================================================================
