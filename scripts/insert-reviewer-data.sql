-- L_Reviewer 테이블 확인 및 테스트 데이터 삽입

-- 먼저 테이블이 있는지 확인
SELECT table_name FROM information_schema.tables WHERE table_name = 'L_Reviewer';

-- 기존 데이터 확인
SELECT * FROM "L_Reviewer" ORDER BY "사번";

-- 테스트 데이터 삽입 (이미 있다면 업데이트)
INSERT INTO "L_Reviewer" ("NO", "사번", "성명", "FY26 팀명", "Reviewer 사번", "1차 Reviewer") VALUES
('1', '270767', '김재동', 'Digital Assurance Team', '123456', '박팀장'),
('2', '270768', '이영희', 'Digital Assurance Team', '270767', '김재동'),
('3', '270769', '박민수', 'Digital Assurance Team', '270767', '김재동'),
('4', '270770', '정수진', 'Digital Assurance Team', '270767', '김재동'),
('5', '123456', '박팀장', 'Digital Assurance Team', '999999', '최부장')
ON CONFLICT ("사번") DO UPDATE SET
  "성명" = EXCLUDED."성명",
  "FY26 팀명" = EXCLUDED."FY26 팀명",
  "Reviewer 사번" = EXCLUDED."Reviewer 사번",
  "1차 Reviewer" = EXCLUDED."1차 Reviewer";

-- 결과 확인
SELECT 
  "사번", 
  "성명", 
  "FY26 팀명",
  "Reviewer 사번",
  "1차 Reviewer"
FROM "L_Reviewer" 
ORDER BY "사번";

-- 특정 사번의 리뷰어 권한 확인
SELECT 
  '270767 김재동의 리뷰 대상자:' as info,
  "사번", 
  "성명"
FROM "L_Reviewer" 
WHERE "Reviewer 사번" = '270767';

SELECT 
  '270767 김재동의 정보:' as info,
  "사번", 
  "성명",
  "1차 Reviewer"
FROM "L_Reviewer" 
WHERE "사번" = '270767'; 