-- RLS 정책을 우회하여 reviewer_feedback을 안전하게 관리하는 함수들

-- 1. 평가 피드백 조회 함수
CREATE OR REPLACE FUNCTION get_reviewer_feedback(
  p_reviewed_empno VARCHAR,
  p_reviewer_empno VARCHAR
)
RETURNS TABLE(
  id BIGINT,
  reviewed_empno VARCHAR,
  reviewer_empno VARCHAR,
  reviewer_name VARCHAR,
  reviewer_grade VARCHAR,
  comment TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rf.id,
    rf.reviewed_empno,
    rf.reviewer_empno,
    rf.reviewer_name,
    rf.reviewer_grade,
    rf.comment,
    rf.created_at,
    rf.updated_at
  FROM reviewer_feedback rf
  WHERE rf.reviewed_empno = p_reviewed_empno 
    AND rf.reviewer_empno = p_reviewer_empno
  ORDER BY rf.created_at DESC;
END;
$$;

-- 2. 평가 피드백 생성 함수
CREATE OR REPLACE FUNCTION insert_reviewer_feedback(
  p_reviewed_empno VARCHAR,
  p_reviewer_empno VARCHAR,
  p_reviewer_name VARCHAR,
  p_reviewer_grade VARCHAR,
  p_comment TEXT
)
RETURNS BIGINT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_id BIGINT;
BEGIN
  INSERT INTO reviewer_feedback (
    reviewed_empno,
    reviewer_empno,
    reviewer_name,
    reviewer_grade,
    comment
  ) VALUES (
    p_reviewed_empno,
    p_reviewer_empno,
    p_reviewer_name,
    p_reviewer_grade,
    p_comment
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- 3. 평가 피드백 업데이트 함수
CREATE OR REPLACE FUNCTION update_reviewer_feedback(
  p_feedback_id BIGINT,
  p_comment TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE reviewer_feedback
  SET 
    comment = p_comment,
    updated_at = NOW()
  WHERE id = p_feedback_id;
  
  RETURN FOUND;
END;
$$;

-- 4. 특정 사용자가 받은 모든 피드백 조회 함수 (인트로 페이지용)
CREATE OR REPLACE FUNCTION get_user_received_feedback(
  p_empno VARCHAR
)
RETURNS TABLE(
  id BIGINT,
  reviewer_empno VARCHAR,
  reviewer_name VARCHAR,
  reviewer_grade VARCHAR,
  comment TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rf.id,
    rf.reviewer_empno,
    rf.reviewer_name,
    rf.reviewer_grade,
    rf.comment,
    rf.created_at,
    rf.updated_at
  FROM reviewer_feedback rf
  WHERE rf.reviewed_empno = p_empno
  ORDER BY rf.created_at DESC;
END;
$$;

-- 함수들에 대한 권한 부여
GRANT EXECUTE ON FUNCTION get_reviewer_feedback TO authenticated;
GRANT EXECUTE ON FUNCTION insert_reviewer_feedback TO authenticated;
GRANT EXECUTE ON FUNCTION update_reviewer_feedback TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_received_feedback TO authenticated; 