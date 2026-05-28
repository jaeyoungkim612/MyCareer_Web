-- =====================================================================
-- 성능 최적화: Views + RPC Functions
-- 작성일: 2026-05-28
-- 목적: 클라이언트 N+1 쿼리 및 무거운 JS 집계를 DB로 이동
-- =====================================================================
-- 적용 방법:
--   1. Supabase Dashboard → SQL Editor
--   2. 이 파일 전체를 붙여넣고 RUN
--   3. 모든 SELECT 'created ...' 메시지가 정상 출력되는지 확인
-- =====================================================================


-- ---------------------------------------------------------------------
-- #1: 팀원 평가 상태 일괄 조회 RPC
-- ---------------------------------------------------------------------
-- BEFORE: 팀원 1명당 15쿼리 × N명 (10명이면 150쿼리)
-- AFTER:  1쿼리로 N명 전체 조회
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS get_team_assessment_status(TEXT[]);

CREATE OR REPLACE FUNCTION get_team_assessment_status(p_empno_list TEXT[])
RETURNS TABLE (
  empno TEXT,
  business_plan_status TEXT,
  people_plan_status TEXT,
  collaboration_plan_status TEXT,
  quality_plan_status TEXT,
  industry_plan_status TEXT,
  business_mid_status TEXT,
  business_final_status TEXT,
  people_mid_status TEXT,
  people_final_status TEXT,
  collaboration_mid_status TEXT,
  collaboration_final_status TEXT,
  quality_mid_status TEXT,
  quality_final_status TEXT,
  industry_mid_status TEXT,
  industry_final_status TEXT,
  last_updated TIMESTAMPTZ
)
LANGUAGE SQL STABLE AS $$
  WITH input_empnos AS (
    SELECT unnest(p_empno_list) AS empno
  ),
  -- Plan tables: 동일 employee_id 다중 row 가능 → 최신 1건만
  bp AS (
    SELECT DISTINCT ON (employee_id) employee_id, status, updated_at
    FROM business_goals
    WHERE employee_id = ANY(p_empno_list)
    ORDER BY employee_id, created_at DESC
  ),
  pp AS (
    SELECT DISTINCT ON (employee_id) employee_id, status, updated_at
    FROM people_goals
    WHERE employee_id = ANY(p_empno_list)
    ORDER BY employee_id, created_at DESC
  ),
  cp AS (
    SELECT DISTINCT ON (employee_id) employee_id, status, updated_at
    FROM collaborations
    WHERE employee_id = ANY(p_empno_list)
    ORDER BY employee_id, created_at DESC
  ),
  qp AS (
    SELECT DISTINCT ON (employee_id) employee_id, status, updated_at
    FROM quality_non_audit_performance
    WHERE employee_id = ANY(p_empno_list)
    ORDER BY employee_id, created_at DESC
  ),
  ip AS (
    SELECT DISTINCT ON (employee_id) employee_id, status, updated_at
    FROM industry_tl_planning
    WHERE employee_id = ANY(p_empno_list)
    ORDER BY employee_id, created_at DESC
  ),
  -- Assessment tables: empno UNIQUE → 그대로 사용
  bm AS (SELECT empno, status FROM business_mid_assessments WHERE empno = ANY(p_empno_list)),
  bf AS (SELECT empno, status FROM business_final_assessments WHERE empno = ANY(p_empno_list)),
  pm AS (SELECT empno, status FROM people_mid_assessments WHERE empno = ANY(p_empno_list)),
  pf AS (SELECT empno, status FROM people_final_assessments WHERE empno = ANY(p_empno_list)),
  cm AS (SELECT empno, status FROM collaboration_mid_assessments WHERE empno = ANY(p_empno_list)),
  cf AS (SELECT empno, status FROM collaboration_final_assessments WHERE empno = ANY(p_empno_list)),
  qm AS (SELECT empno, status FROM quality_mid_assessments WHERE empno = ANY(p_empno_list)),
  qf AS (SELECT empno, status FROM quality_final_assessments WHERE empno = ANY(p_empno_list)),
  im AS (SELECT empno, status FROM industry_tl_mid_assessments WHERE empno = ANY(p_empno_list)),
  iff_ AS (SELECT empno, status FROM industry_tl_final_assessments WHERE empno = ANY(p_empno_list))
  SELECT
    i.empno,
    bp.status::TEXT,
    pp.status::TEXT,
    cp.status::TEXT,
    qp.status::TEXT,
    ip.status::TEXT,
    bm.status::TEXT,
    bf.status::TEXT,
    pm.status::TEXT,
    pf.status::TEXT,
    cm.status::TEXT,
    cf.status::TEXT,
    qm.status::TEXT,
    qf.status::TEXT,
    im.status::TEXT,
    iff_.status::TEXT,
    GREATEST(bp.updated_at, pp.updated_at, cp.updated_at, qp.updated_at, ip.updated_at) AS last_updated
  FROM input_empnos i
  LEFT JOIN bp ON bp.employee_id = i.empno
  LEFT JOIN pp ON pp.employee_id = i.empno
  LEFT JOIN cp ON cp.employee_id = i.empno
  LEFT JOIN qp ON qp.employee_id = i.empno
  LEFT JOIN ip ON ip.employee_id = i.empno
  LEFT JOIN bm ON bm.empno = i.empno
  LEFT JOIN bf ON bf.empno = i.empno
  LEFT JOIN pm ON pm.empno = i.empno
  LEFT JOIN pf ON pf.empno = i.empno
  LEFT JOIN cm ON cm.empno = i.empno
  LEFT JOIN cf ON cf.empno = i.empno
  LEFT JOIN qm ON qm.empno = i.empno
  LEFT JOIN qf ON qf.empno = i.empno
  LEFT JOIN im ON im.empno = i.empno
  LEFT JOIN iff_ ON iff_.empno = i.empno;
$$;

GRANT EXECUTE ON FUNCTION get_team_assessment_status(TEXT[]) TO anon, authenticated;

SELECT 'created get_team_assessment_status' AS status;


-- ---------------------------------------------------------------------
-- #2: BPR_fact 집계 RPC (사번 기준 + 본부 기준)
-- ---------------------------------------------------------------------
-- BEFORE: BPR_fact 수천 행을 클라이언트로 가져와서 JS forEach 12개 합계
-- AFTER:  서버에서 GROUP BY로 6개 값만 반환 (~99% 페이로드 감소)
-- ---------------------------------------------------------------------

-- 공통 헬퍼: 감사구분 정규화
CREATE OR REPLACE FUNCTION _bpr_is_audit(audit_raw TEXT)
RETURNS BOOLEAN LANGUAGE SQL IMMUTABLE AS $$
  SELECT audit_raw LIKE '%감사%' AND audit_raw NOT LIKE '%비감사%';
$$;

-- 공통 헬퍼: TEXT → NUMERIC 안전 변환 (JS의 parseFloat(String(x || 0)) 대응)
-- BPR_fact의 금액 컬럼이 TEXT로 저장되어 있어서 필요
CREATE OR REPLACE FUNCTION _safe_numeric(t TEXT)
RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF t IS NULL OR t = '' THEN RETURN 0; END IF;
  BEGIN
    RETURN t::NUMERIC;
  EXCEPTION WHEN OTHERS THEN
    RETURN 0;
  END;
END;
$$;

-- 사번 기준 (My BPR)
DROP FUNCTION IF EXISTS get_bpr_aggregate_by_person(TEXT[], TEXT);
DROP FUNCTION IF EXISTS get_bpr_aggregate_by_person(TEXT[], DATE);

CREATE OR REPLACE FUNCTION get_bpr_aggregate_by_person(
  p_empno_list TEXT[],
  p_report_date TEXT DEFAULT NULL
)
RETURNS TABLE (
  audit_revenue NUMERIC,
  non_audit_revenue NUMERIC,
  audit_backlog NUMERIC,
  non_audit_backlog NUMERIC,
  audit_pipeline NUMERIC,
  non_audit_pipeline NUMERIC
)
LANGUAGE SQL STABLE AS $$
  WITH target_date AS (
    SELECT COALESCE(p_report_date,
      (SELECT MAX("CDM_REPORT_DATE") FROM "BPR_fact" WHERE "CDM_REPORT_DATE" IS NOT NULL)
    ) AS d
  ),
  base AS (
    SELECT
      _bpr_is_audit("감사 구분") AS is_audit,
      TRIM("CDM_SOURCE") AS src,
      TRIM("CDM_STAGE") AS stage,
      _safe_numeric("CDM_REVENUE_TOTAL") AS revenue_total,
      _safe_numeric("CDM_REVENUE_BACKLOG_M1") + _safe_numeric("CDM_REVENUE_BACKLOG_M2")
      + _safe_numeric("CDM_REVENUE_BACKLOG_M3") + _safe_numeric("CDM_REVENUE_BACKLOG_M4")
      + _safe_numeric("CDM_REVENUE_BACKLOG_M5") + _safe_numeric("CDM_REVENUE_BACKLOG_M6")
      + _safe_numeric("CDM_REVENUE_BACKLOG_M7") + _safe_numeric("CDM_REVENUE_BACKLOG_M8")
      + _safe_numeric("CDM_REVENUE_BACKLOG_M9") + _safe_numeric("CDM_REVENUE_BACKLOG_M10")
      + _safe_numeric("CDM_REVENUE_BACKLOG_M11") + _safe_numeric("CDM_REVENUE_BACKLOG_M12")
        AS backlog_total,
      _safe_numeric("CDM_REVENUE_TOTAL_Q1") + _safe_numeric("CDM_REVENUE_TOTAL_Q2")
      + _safe_numeric("CDM_REVENUE_TOTAL_Q3") + _safe_numeric("CDM_REVENUE_TOTAL_Q4")
        AS pipeline_total
    FROM "BPR_fact" b, target_date td
    WHERE b."CDM_PERSON_ID" = ANY(p_empno_list)
      AND b."CDM_REPORT_DATE" = td.d
      AND b."CDM_SOURCE" IS NOT NULL
  )
  SELECT
    -- Revenue: F-link + Realized
    SUM(CASE WHEN is_audit AND src = 'F-link' AND stage = 'Realized' THEN revenue_total ELSE 0 END) / 1000000.0,
    SUM(CASE WHEN NOT is_audit AND src = 'F-link' AND stage = 'Realized' THEN revenue_total ELSE 0 END) / 1000000.0,
    -- Backlog: F-link + Backlog
    SUM(CASE WHEN is_audit AND src = 'F-link' AND stage = 'Backlog' THEN backlog_total ELSE 0 END) / 1000000.0,
    SUM(CASE WHEN NOT is_audit AND src = 'F-link' AND stage = 'Backlog' THEN backlog_total ELSE 0 END) / 1000000.0,
    -- Pipeline: Salesforce
    SUM(CASE WHEN is_audit AND src = 'Salesforce' THEN pipeline_total ELSE 0 END) / 1000000.0,
    SUM(CASE WHEN NOT is_audit AND src = 'Salesforce' THEN pipeline_total ELSE 0 END) / 1000000.0
  FROM base;
$$;

GRANT EXECUTE ON FUNCTION get_bpr_aggregate_by_person(TEXT[], TEXT) TO anon, authenticated;

-- 본부 기준 (Team BPR)
DROP FUNCTION IF EXISTS get_bpr_aggregate_by_dept(TEXT, TEXT);
DROP FUNCTION IF EXISTS get_bpr_aggregate_by_dept(TEXT, DATE);

CREATE OR REPLACE FUNCTION get_bpr_aggregate_by_dept(
  p_dept_prefix TEXT,
  p_report_date TEXT DEFAULT NULL
)
RETURNS TABLE (
  audit_revenue NUMERIC,
  non_audit_revenue NUMERIC,
  audit_backlog NUMERIC,
  non_audit_backlog NUMERIC,
  audit_pipeline NUMERIC,
  non_audit_pipeline NUMERIC
)
LANGUAGE SQL STABLE AS $$
  WITH target_date AS (
    SELECT COALESCE(p_report_date,
      (SELECT MAX("CDM_REPORT_DATE") FROM "BPR_fact" WHERE "CDM_REPORT_DATE" IS NOT NULL)
    ) AS d
  ),
  base AS (
    SELECT
      _bpr_is_audit("감사 구분") AS is_audit,
      TRIM("CDM_SOURCE") AS src,
      TRIM("CDM_STAGE") AS stage,
      _safe_numeric("CDM_REVENUE_TOTAL") AS revenue_total,
      _safe_numeric("CDM_REVENUE_BACKLOG_M1") + _safe_numeric("CDM_REVENUE_BACKLOG_M2")
      + _safe_numeric("CDM_REVENUE_BACKLOG_M3") + _safe_numeric("CDM_REVENUE_BACKLOG_M4")
      + _safe_numeric("CDM_REVENUE_BACKLOG_M5") + _safe_numeric("CDM_REVENUE_BACKLOG_M6")
      + _safe_numeric("CDM_REVENUE_BACKLOG_M7") + _safe_numeric("CDM_REVENUE_BACKLOG_M8")
      + _safe_numeric("CDM_REVENUE_BACKLOG_M9") + _safe_numeric("CDM_REVENUE_BACKLOG_M10")
      + _safe_numeric("CDM_REVENUE_BACKLOG_M11") + _safe_numeric("CDM_REVENUE_BACKLOG_M12")
        AS backlog_total,
      _safe_numeric("CDM_REVENUE_TOTAL_Q1") + _safe_numeric("CDM_REVENUE_TOTAL_Q2")
      + _safe_numeric("CDM_REVENUE_TOTAL_Q3") + _safe_numeric("CDM_REVENUE_TOTAL_Q4")
        AS pipeline_total
    FROM "BPR_fact" b, target_date td
    WHERE b."PRJT_CMOFNM" ILIKE p_dept_prefix || '%'
      AND b."CDM_REPORT_DATE" = td.d
      AND b."CDM_SOURCE" IS NOT NULL
  )
  SELECT
    SUM(CASE WHEN is_audit AND src = 'F-link' AND stage = 'Realized' THEN revenue_total ELSE 0 END) / 1000000.0,
    SUM(CASE WHEN NOT is_audit AND src = 'F-link' AND stage = 'Realized' THEN revenue_total ELSE 0 END) / 1000000.0,
    SUM(CASE WHEN is_audit AND src = 'F-link' AND stage = 'Backlog' THEN backlog_total ELSE 0 END) / 1000000.0,
    SUM(CASE WHEN NOT is_audit AND src = 'F-link' AND stage = 'Backlog' THEN backlog_total ELSE 0 END) / 1000000.0,
    SUM(CASE WHEN is_audit AND src = 'Salesforce' THEN pipeline_total ELSE 0 END) / 1000000.0,
    SUM(CASE WHEN NOT is_audit AND src = 'Salesforce' THEN pipeline_total ELSE 0 END) / 1000000.0
  FROM base;
$$;

GRANT EXECUTE ON FUNCTION get_bpr_aggregate_by_dept(TEXT, TEXT) TO anon, authenticated;

SELECT 'created get_bpr_aggregate_by_person, get_bpr_aggregate_by_dept' AS status;


-- ---------------------------------------------------------------------
-- #3: L_BD_Table_Detail 집계 RPC
-- ---------------------------------------------------------------------
-- BEFORE: BD 전체 행 fetch → JS forEach로 감사/비감사 4개 카운터
-- AFTER:  서버에서 GROUP BY로 한 번에
-- 금액 단위: 천원(원본) → 백만원(반환)
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS get_bd_aggregate_by_person(TEXT[]);

CREATE OR REPLACE FUNCTION get_bd_aggregate_by_person(p_empno_list TEXT[])
RETURNS TABLE (
  audit_amount NUMERIC,
  non_audit_amount NUMERIC,
  audit_count BIGINT,
  non_audit_count BIGINT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    SUM(CASE WHEN "Audit/Non-Audit" = '감사' THEN _safe_numeric("Amount"::TEXT) ELSE 0 END) / 1000.0,
    SUM(CASE WHEN "Audit/Non-Audit" = '비감사' THEN _safe_numeric("Amount"::TEXT) ELSE 0 END) / 1000.0,
    COUNT(*) FILTER (WHERE "Audit/Non-Audit" = '감사'),
    COUNT(*) FILTER (WHERE "Audit/Non-Audit" = '비감사')
  FROM "L_BD_Table_Detail"
  WHERE "사번" = ANY(p_empno_list);
$$;

GRANT EXECUTE ON FUNCTION get_bd_aggregate_by_person(TEXT[]) TO anon, authenticated;

SELECT 'created get_bd_aggregate_by_person' AS status;


-- ---------------------------------------------------------------------
-- #6: GSP 데이터 + 승인완료 값 통합 조회 RPC
-- ---------------------------------------------------------------------
-- BEFORE: checkGSPStatus() 1쿼리 + 히스토리 전체 스캔 1쿼리 = 2쿼리
-- AFTER:  1쿼리로 최신값 + 4개 필드별 승인완료된 최신값
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS get_gsp_with_approved_values(TEXT);

CREATE OR REPLACE FUNCTION get_gsp_with_approved_values(p_empno TEXT)
RETURNS TABLE (
  latest_record JSONB,
  approved_보직 TEXT,
  approved_산업전문화 TEXT,
  approved_gsp_focus_30 TEXT,
  approved_council_tf TEXT
)
LANGUAGE SQL STABLE AS $$
  WITH all_records AS (
    SELECT *
    FROM "a_GSP_Table"
    WHERE "사번" = p_empno
    ORDER BY "변경요청일자" DESC NULLS LAST
  ),
  latest AS (
    SELECT to_jsonb(r) AS rec FROM all_records r LIMIT 1
  ),
  approved_보직 AS (
    SELECT "보직(HC)" AS v FROM all_records
    WHERE "보직_STATUS" = '승인완료' AND "보직(HC)" IS NOT NULL
    LIMIT 1
  ),
  approved_산업 AS (
    SELECT "산업전문화" AS v FROM all_records
    WHERE "산업전문화_STATUS" = '승인완료' AND "산업전문화" IS NOT NULL
    LIMIT 1
  ),
  approved_gsp AS (
    SELECT "GSP/Focus 30" AS v FROM all_records
    WHERE "GSP_Focus_30_STATUS" = '승인완료' AND "GSP/Focus 30" IS NOT NULL
    LIMIT 1
  ),
  approved_council AS (
    SELECT "Council/TF 등" AS v FROM all_records
    WHERE "Council_TF_STATUS" = '승인완료' AND "Council/TF 등" IS NOT NULL
    LIMIT 1
  )
  SELECT
    (SELECT rec FROM latest),
    (SELECT v FROM approved_보직),
    (SELECT v FROM approved_산업),
    (SELECT v FROM approved_gsp),
    (SELECT v FROM approved_council);
$$;

GRANT EXECUTE ON FUNCTION get_gsp_with_approved_values(TEXT) TO anon, authenticated;

SELECT 'created get_gsp_with_approved_values' AS status;


-- ---------------------------------------------------------------------
-- 적용 완료
-- ---------------------------------------------------------------------
SELECT '✅ All optimization views & RPCs created' AS final_status;
