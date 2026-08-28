# API 참조

모든 엔드포인트는 `/api/`로 시작하며 `worker.js` 안에서 순서대로 매칭됩니다.
줄번호는 이 커밋 기준 `worker.js`의 핸들러 시작 위치입니다 (정확한 요청/응답 필드는 해당 줄을 직접 볼 것).

## 인증 레벨
- **공개**: 로그인 없이 호출 가능
- **로그인**: 구글 로그인만 되어 있으면 됨 (승인 대기 상태 포함)
- **학회원**: `member` 또는 `admin` 역할만 (`canRead()`) — 승인 대기 상태는 403
- **운영진**: `admin`만 (`isAdmin()`) — 학회원은 403

## 인증
| 메서드 | 경로 | 인증 | 설명 | 줄 |
|---|---|---|---|---|
| GET | `/api/config` | 공개 | `GOOGLE_CLIENT_ID` 등 프런트에 필요한 공개 설정 반환 | 552 |
| POST | `/api/auth/google` | 공개 | 구글 ID 토큰(credential) 검증 → 세션 쿠키 발급 | 559 |
| POST | `/api/auth/logout` | 로그인 | 세션 쿠키 제거 | 570 |
| GET | `/api/me` | 공개 | 현재 로그인 상태·역할 조회 | 578 |

## 회원·운영진 관리
| 메서드 | 경로 | 인증 | 설명 | 줄 |
|---|---|---|---|---|
| GET | `/api/members` | 운영진 | 전체 회원 목록(상태·역할 포함) | 595 |
| POST | `/api/members/:email/decision` | 운영진 | 가입 승인/거절 | 614 |
| POST | `/api/members/:email/role` | 운영진 | 운영진 임명/해제 (bootstrap 계정·본인 해제는 서버에서 차단) | 633 |

## 설정
| 메서드 | 경로 | 인증 | 설명 | 줄 |
|---|---|---|---|---|
| GET | `/api/settings` | 학회원 | 학기·목표·로드맵·모집 정보 조회 | 678 |
| PUT | `/api/settings` | 운영진 | 위 항목 수정 | 681 |

## 번역
| 메서드 | 경로 | 인증 | 설명 | 줄 |
|---|---|---|---|---|
| POST | `/api/translate` | 학회원 | `{texts:[], target:'en'|'ko'}` → 번역된 배열 (D1 캐시, 실패 시 원문 반환) | 664 |

## 공지 (모집 신청 포함)
| 메서드 | 경로 | 인증 | 설명 | 줄 |
|---|---|---|---|---|
| GET | `/api/notices` | 학회원 | 목록 | 692 |
| POST | `/api/notices` | 운영진 | 등록 (모집이면 캘린더 자동 생성) | 727 |
| PATCH | `/api/notices/:id` | 작성자 or 운영진 | 수정 | 746 |
| DELETE | `/api/notices/:id` | 작성자 or 운영진 | 삭제 (캘린더 이벤트도 제거) | 763 |
| POST | `/api/notices/:id/join` | 학회원 | 모집 신청/취소 (정원 체크) | 774 |

## 캘린더
| 메서드 | 경로 | 인증 | 설명 | 줄 |
|---|---|---|---|---|
| GET | `/api/calendar` | 학회원 | 공개 캘린더 이벤트 조회 (iCal 파싱 or API, 60초 캐시) | 803 |

## 일정
| 메서드 | 경로 | 인증 | 설명 | 줄 |
|---|---|---|---|---|
| GET | `/api/schedules` | 학회원 | 목록 | 813 |
| POST | `/api/schedules` | 학회원 | 등록 (캘린더 자동 생성) | 822 |
| PATCH | `/api/schedules/:id` | 작성자 or 운영진 | 수정 | 841 |
| DELETE | `/api/schedules/:id` | 작성자 or 운영진 | 삭제 | 856 |

## 활동 기록 (수요조사 겸용)
| 메서드 | 경로 | 인증 | 설명 | 줄 |
|---|---|---|---|---|
| GET | `/api/activities` | 학회원 | 목록 | 863 |
| POST | `/api/activities` | 학회원 | 등록 | 872 |
| PATCH | `/api/activities/:id` | 작성자 or 운영진 | 수정 | 893 |
| DELETE | `/api/activities/:id` | 작성자 or 운영진 | 삭제 | 910 |

## 자료실
| 메서드 | 경로 | 인증 | 설명 | 줄 |
|---|---|---|---|---|
| GET | `/api/materials` | 학회원 | 목록 | 917 |
| POST | `/api/materials` | 학회원 | 등록 | 930 |
| PATCH | `/api/materials/:id` | 작성자 or 운영진 | 수정 | 948 |
| DELETE | `/api/materials/:id` | 작성자 or 운영진 | 삭제 | 962 |

## 건의함
| 메서드 | 경로 | 인증 | 설명 | 줄 |
|---|---|---|---|---|
| GET | `/api/ideas` | 학회원 | 목록 | 967 |
| POST | `/api/ideas` | 학회원 | 등록 | 986 |
| POST | `/api/ideas/:id/like` | 학회원 | 좋아요 토글 | 996 |
| POST | `/api/ideas/:id/status` | 운영진 | 상태 변경(검토중/반영됨 등) | 1006 |
| GET | `/api/ideas/:id/replies` | 학회원 | 답글 목록 | 1015 |
| POST | `/api/ideas/:id/replies` | 학회원 | 답글 등록 | 1024 |
| PATCH | `/api/ideas/:id` | 작성자 or 운영진 | 수정 | 1034 |
| DELETE | `/api/ideas/:id` | 작성자 or 운영진 | 삭제 | 1043 |

## 투표 (API 경로는 `votes`, 화면 명칭은 "투표/폴")
| 메서드 | 경로 | 인증 | 설명 | 줄 |
|---|---|---|---|---|
| GET | `/api/votes` | 학회원 | 목록 | 1056 |
| POST | `/api/votes` | 운영진 | 개설 | 1059 |
| PATCH | `/api/votes/:id` | 운영진 | 수정(마감일 등) | 1082 |
| DELETE | `/api/votes/:id` | 작성자 or 운영진 | 삭제 | 1096 |
| (하위 경로) | `/api/votes/:id/...` | 학회원 | 투표 참여·토론 등 — 1100줄부터 세부 분기 | 1100 |

## 공통 에러 응답
`{ "error": "메시지" }` 형태, 상태 코드로 구분:
- `401` — 로그인 필요 (`DENY_GUEST`)
- `403` — 승인 대기(`DENY_PENDING`) 또는 운영진 전용(`DENY_ADMIN`)
- 그 외 4xx/5xx — 개별 핸들러의 유효성 검사 실패
