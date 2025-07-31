-- 실제 로그인한 사용자를 위한 L_Reviewer 데이터 추가

-- 1. 현재 테이블 상태 확인
SELECT 'L_Reviewer 테이블 현재 상태:' as info;
SELECT * FROM "L_Reviewer" ORDER BY "사번";

-- 2. 일단 홍준기(현재 로그인 사용자)가 리뷰어가 되도록 데이터 추가
-- 홍준기의 사번을 모르니까 여러 경우의 수로 추가

-- Case 1: 홍준기 사번이 000001인 경우
INSERT INTO "L_Reviewer" ("NO", "사번", "성명", "FY26 팀명", "Reviewer 사번", "1차 Reviewer") VALUES
('10', '000001', '홍준기', 'Digital Team', '999999', '최상급'),
('11', '000002', '김팀원1', 'Digital Team', '000001', '홍준기'),
('12', '000003', '김팀원2', 'Digital Team', '000001', '홍준기'),
('13', '000004', '김팀원3', 'Digital Team', '000001', '홍준기')
ON CONFLICT ("사번") DO UPDATE SET
  "성명" = EXCLUDED."성명",
  "FY26 팀명" = EXCLUDED."FY26 팀명",
  "Reviewer 사번" = EXCLUDED."Reviewer 사번",
  "1차 Reviewer" = EXCLUDED."1차 Reviewer";

-- Case 2: 홍준기 사번이 070767인 경우  
INSERT INTO "L_Reviewer" ("NO", "사번", "성명", "FY26 팀명", "Reviewer 사번", "1차 Reviewer") VALUES
('20', '070767', '홍준기', 'Digital Team', '999999', '최상급'),
('21', '070768', '이팀원1', 'Digital Team', '070767', '홍준기'),
('22', '070769', '박팀원2', 'Digital Team', '070767', '홍준기'),
('23', '070770', '정팀원3', 'Digital Team', '070767', '홍준기')
ON CONFLICT ("사번") DO UPDATE SET
  "성명" = EXCLUDED."성명",
  "FY26 팀명" = EXCLUDED."FY26 팀명",
  "Reviewer 사번" = EXCLUDED."Reviewer 사번",
  "1차 Reviewer" = EXCLUDED."1차 Reviewer";

-- Case 3: 홍준기 사번이 200001인 경우
INSERT INTO "L_Reviewer" ("NO", "사번", "성명", "FY26 팀명", "Reviewer 사번", "1차 Reviewer") VALUES
('30', '200001', '홍준기', 'Digital Team', '999999', '최상급'),
('31', '200002', '강팀원1', 'Digital Team', '200001', '홍준기'),
('32', '200003', '윤팀원2', 'Digital Team', '200001', '홍준기'),
('33', '200004', '조팀원3', 'Digital Team', '200001', '홍준기')
ON CONFLICT ("사번") DO UPDATE SET
  "성명" = EXCLUDED."성명",
  "FY26 팀명" = EXCLUDED."FY26 팀명",
  "Reviewer 사번" = EXCLUDED."Reviewer 사번",
  "1차 Reviewer" = EXCLUDED."1차 Reviewer";

-- Case 4: 기존 270767 데이터도 유지
INSERT INTO "L_Reviewer" ("NO", "사번", "성명", "FY26 팀명", "Reviewer 사번", "1차 Reviewer") VALUES
('40', '270767', '김재동', 'Assurance Team', '999999', '최상급'),
('41', '270768', '이영희', 'Assurance Team', '270767', '김재동'),
('42', '270769', '박민수', 'Assurance Team', '270767', '김재동'),
('43', '270770', '정수진', 'Assurance Team', '270767', '김재동')
ON CONFLICT ("사번") DO UPDATE SET
  "성명" = EXCLUDED."성명",
  "FY26 팀명" = EXCLUDED."FY26 팀명",
  "Reviewer 사번" = EXCLUDED."Reviewer 사번",
  "1차 Reviewer" = EXCLUDED."1차 Reviewer";

-- 3. 최종 결과 확인
SELECT 'L_Reviewer 테이블 최종 상태:' as info;
SELECT "사번", "성명", "FY26 팀명", "Reviewer 사번", "1차 Reviewer" FROM "L_Reviewer" ORDER BY "사번";

-- 4. 각 사번별 리뷰어 권한 확인
SELECT 'Reviewer 권한 확인:' as info;
SELECT 
  "Reviewer 사번" as "리뷰어_사번",
  COUNT(*) as "담당_팀원_수",
  STRING_AGG("성명", ', ') as "담당_팀원들"
FROM "L_Reviewer" 
GROUP BY "Reviewer 사번" 
HAVING COUNT(*) > 0
ORDER BY "Reviewer 사번"; 