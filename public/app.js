(function () {
"use strict";

/* ================================================================
   i18n — 정적 UI 문구(사전 번역) + 동적 콘텐츠(구글 번역 API, 캐시)
   ================================================================ */
let LANG = "ko";
try { LANG = localStorage.getItem("sfa.lang") === "en" ? "en" : "ko"; } catch (e) {}

const HANGUL_RE = /[가-힣ᄀ-ᇿ㄰-㆏]/;
function hasHangul(s) { return HANGUL_RE.test(String(s || "")); }

/* ---- 정적 UI 사전 ---- */
const STR = {
  ko: {
    "brand.name": "세종 금융학회",
    "gate.lead": "학회원만 이용할 수 있습니다.<br>구글 계정으로 로그인해 주세요.",
    "gate.switchAccount": "다른 계정으로 로그인",
    "gate.foot": "로그인하면 가입 신청이 접수되고, 운영진 승인 후 이용할 수 있습니다.",
    "gate.pendingTitle": "승인 대기 중입니다",
    "gate.pendingBody": "가입 신청이 접수되었습니다. 운영진이 승인하면 바로 이용할 수 있습니다.",
    "gate.rejectedTitle": "가입이 승인되지 않았습니다",
    "gate.rejectedBody": "운영진에게 문의해 주세요.",
    "gate.setupTitle": "설정이 아직 끝나지 않았습니다",
    "gate.setupBody": "구글 클라이언트 ID와 세션 비밀키가 등록되지 않아 로그인할 수 없습니다.",
    "gate.googleLoadFail": "구글 로그인을 불러오지 못했습니다. 새로고침해 주세요.",

    "common.seeAll": "전체보기", "common.refresh": "새로고침", "common.edit": "수정", "common.delete": "삭제",
    "common.cancel": "취소", "common.confirm": "확인", "common.close": "닫기", "common.save": "저장하기",
    "common.saved": "저장했습니다.", "common.loading": "불러오는 중…", "common.connected": "연결됨",
    "common.loadFailed": "불러오지 못함", "common.none": "—", "common.location": "장소 미정",

    "home.roadmap": "운영 로드맵 보기 →", "home.upcoming": "다가오는 일정", "home.recentActivities": "최근 활동",
    "home.newNotices": "새로운 소식", "home.activePolls": "진행 중인 투표",
    "home.noUpcoming": "다가오는 일정이 없습니다.", "home.noActivities": "아직 기록된 활동이 없습니다.",
    "home.noNotices": "게시된 공지가 없습니다.", "home.noPolls": "진행 중인 투표가 없습니다.",
    "home.attendees": "명 참여", "home.deadline": " 마감", "home.applied": "명 신청", "home.capacitySlash": " / 정원 ",
    "home.allDay": " · 종일",

    "activities.title": "활동 기록", "activities.desc": "무엇을 했고 몇 명이 함께했는지 남기면, 학기 말 보고가 그대로 완성됩니다.",
    "activities.newBtn": "활동 기록", "activities.tracks": "주제 분류는 경제 · 비즈니스 · 국가별 주제 세 트랙을 따릅니다.",
    "activities.count": "건의 기록", "activities.empty.title": "아직 기록된 활동이 없습니다",
    "activities.empty.body": "첫 활동을 기록하면 여기에 쌓입니다.", "activities.dateLabel": "Date", "activities.attendLabel": "Attendance",

    "calendar.title": "학회 일정", "calendar.desc": "구글 캘린더와 앱에 등록한 일정을 함께 보여줍니다.",
    "calendar.openGoogle": "구글 캘린더 ↗", "calendar.newBtn": "일정 등록", "calendar.sharedName": "학회 공유 캘린더",
    "calendar.checking": "확인 중", "calendar.hint": "일정 추가·수정은 구글 캘린더에서 하시면 이곳에 바로 반영됩니다. 학회 캘린더에 접근 권한이 있는 계정으로 로그인해 있으면 일정 제목까지 보입니다.",
    "calendar.inApp": "앱에 등록한 일정", "calendar.liveSync": "실시간 연동됨", "calendar.notSynced": "미연동",
    "calendar.empty": "앱에 등록한 일정이 없습니다. 대부분의 일정은 위 구글 캘린더에서 관리합니다.",
    "calendar.addToGoogle": "구글에 추가 ↗", "calendar.googleBadge": "구글", "calendar.reloaded": "구글 캘린더를 다시 불러왔습니다.",

    "notices.title": "소식과 결정", "notices.desc": "중요한 공지는 위로 고정해 아무도 놓치지 않게 하세요.",
    "notices.newBtn": "공지 작성", "notices.pinned": "중요", "notices.plain": "공지", "notices.signupBadge": "모집",
    "notices.empty.title": "아직 게시된 공지가 없습니다", "notices.empty.body": "운영진이 공지를 올리면 여기에 표시됩니다.",
    "notices.pastEvent": "지난 일정", "notices.joinCancel": "참여 취소", "notices.joinClosed": "마감됨",
    "notices.joinFull": "정원 마감", "notices.join": "참여할래요", "notices.people": "명", "notices.noParticipants": "아직 신청한 사람이 없습니다.",
    "notices.joined": "참여 신청했습니다.", "notices.left": "참여를 취소했습니다.",

    "votes.title": "함께 결정하기", "votes.desc": "안건을 충분히 읽고 한 표를 행사한 뒤, 서로의 근거를 나눠보세요.",
    "votes.newBtn": "투표 열기", "votes.hint": "운영진이 투표를 열며, 마감 전까지 선택을 바꿀 수 있습니다.",
    "votes.inProgress": "진행 중", "votes.ended": "종료", "votes.multiBadge": "복수 선택",
    "votes.empty.title": "아직 열린 투표가 없어요", "votes.empty.body": "운영진이 새 안건을 열면 여기에서 참여할 수 있습니다.",
    "votes.currentJoined": "현재 ", "votes.peopleJoined": "명 참여", "votes.totalVotes": " · 총 ", "votes.votesSuffix": "표",
    "votes.myChoice": "내 선택 ", "votes.notChosenYet": "아직 선택하지 않음", "votes.discuss": "의견 나누기",
    "votes.showComments": "의견 보기", "votes.hideComments": "의견 접기", "votes.firstComment": "첫 번째 의견을 남겨보세요.",
    "votes.neutral": "중립·질문", "votes.commentPh": "선택의 근거나 질문을 남겨주세요", "votes.post": "등록",
    "votes.openedBy": "개설 ", "votes.selectedNote": "내가 선택함 — 다시 누르면 해제", "votes.endedNote": "종료된 투표",
    "votes.addToSelection": "선택에 추가", "votes.voteThis": "이 항목에 투표", "votes.reflected": "선택이 반영되었습니다.",

    "ideas.title": "건의 게시판", "ideas.desc": "학회에 바라는 점을 자유롭게 올려주세요. 공감이 많은 건의부터 운영진이 검토합니다.",
    "ideas.newBtn": "건의하기", "ideas.hint": "공감 버튼으로 다른 사람의 건의에 힘을 보탤 수 있습니다.",
    "ideas.count": "건의 제안", "ideas.empty.title": "아직 올라온 건의가 없습니다",
    "ideas.empty.body": "학회에 바라는 점을 처음으로 남겨보세요.", "ideas.noReplies": "아직 답변이 없습니다.",
    "ideas.like": "공감", "ideas.showReplies": "답변 ", "ideas.repliesShown": " 보기", "ideas.repliesHidden": " 접기",
    "ideas.replyPh": "답변이나 의견을 남겨주세요", "ideas.replyPosted": "답변을 남겼습니다.",
    "ideas.statusChanged": "상태를 바꿨습니다.",

    "archive.title": "자료실", "archive.desc": "구글 드라이브 폴더를 그대로 띄웁니다. 파일을 누르면 드라이브에서 열립니다.",
    "archive.openDrive": "드라이브에서 열기 ↗", "archive.sharedFolder": "학회 공유 폴더",
    "archive.driveHint": "폴더가 안 보이면 드라이브에서 <b>링크가 있는 모든 사용자</b>에게 공유되어 있는지 확인해 주세요.",
    "archive.linksTitle": "직접 등록한 링크", "archive.linksDesc": "드라이브 밖의 자료나 자주 쓰는 문서를 태그와 함께 모아둡니다.",
    "archive.newBtn": "자료 등록", "archive.search": "자료 이름이나 태그로 검색",
    "archive.noFolder": "드라이브 폴더가 아직 등록되지 않았습니다.", "archive.reloaded": "드라이브 폴더를 다시 불러옵니다.",
    "archive.noResults": "검색 결과가 없습니다", "archive.noResultsBody": "다른 이름이나 태그로 찾아보세요.",
    "archive.empty": "등록된 자료가 없습니다", "archive.emptyBody": "자료 링크를 등록하고 태그를 붙여보세요.",

    "office.title": "운영실", "office.desc": "학기의 방향과 연구 트랙, 학회원 승인을 관리합니다.",
    "office.members": "학회원 승인", "office.roadmap": "학기 운영 로드맵", "office.topics": "연구 주제",
    "office.recruit": "리크루팅", "office.settings": "학기 설정", "office.termSettings": "학기와 진행률",
    "office.goalSettings": "이번 학기 방향", "office.planning": "계획 중", "office.term": "이번 학기",
    "office.stateDone": "완료", "office.stateNow": "진행 중", "office.stateNext": "예정", "office.unset": "미정",
    "office.notSet": "미설정", "office.noApplicants": "아직 가입 신청이 없습니다.", "office.waiting": " 대기",
    "office.approve": "승인", "office.reject": "거부", "office.approved": "학회원으로 승인했습니다.",
    "office.rejected": "가입을 거부했습니다.",
    "office.founder": "최초 운영진", "office.officer": "운영진",
    "office.makeOfficer": "운영진으로 지정", "office.revokeOfficer": "운영진 해제",
    "office.revokeConfirm": "이 학회원의 운영진 권한을 해제할까요? 학회원 권한은 유지됩니다.",
    "office.officerAssigned": "운영진으로 지정했습니다.", "office.officerRevoked": "운영진 권한을 해제했습니다.",
    "office.recruitEdit": "리크루팅 정보 수정", "office.roadmapEdit": "로드맵 수정",
    "office.roadmapAdd": "＋ 단계 추가", "office.roadmapRemove": "단계 삭제",
    "office.roadmapNoTitle": "제목이 있는 단계를 1개 이상 입력해 주세요.",
    "office.roadmapSaved": "로드맵을 저장했습니다.", "office.recruitSaved": "리크루팅 정보를 저장했습니다.",

    "role.admin": "운영진", "role.member": "학회원", "role.pending": "승인 대기", "role.rejected": "승인 거부", "role.visitor": "방문자",
    "memberStatus.pending": "승인 대기", "memberStatus.approved": "승인됨", "memberStatus.rejected": "거부됨",
    "ideaStatus.open": "접수됨", "ideaStatus.reviewing": "검토 중", "ideaStatus.done": "반영됨", "ideaStatus.closed": "보류",

    "confirm.deleteTitle": "삭제", "confirm.deleteMsg": "삭제하면 모든 학회원에게서 사라집니다. 되돌릴 수 없습니다.",
    "confirm.deleteBtn": "삭제하기", "confirm.deleted": "삭제했습니다.",
    "label.notices": "공지", "label.schedules": "일정", "label.activities": "활동 기록",
    "label.votes": "투표", "label.materials": "자료", "label.ideas": "건의",

    "err.needTitleBody": "제목과 내용을 모두 입력해 주세요.",
    "err.needDateTime": "날짜와 시간을 선택해 주세요.",
    "err.needActivityContent": "활동 내용을 입력해 주세요.",
    "err.needActivityDate": "날짜를 선택해 주세요.",
    "err.needHeadcount": "참여 인원을 1명 이상으로 입력해 주세요.",
    "err.needMaterialName": "자료 이름을 입력해 주세요.",
    "err.needValidUrl": "링크는 http:// 또는 https:// 로 시작해야 합니다.",
    "err.needDeadline": "종료 기한을 선택해 주세요.",
    "err.deadlineFuture": "종료 기한은 지금보다 뒤여야 합니다.",
    "err.needTwoOptions": "선택지를 2개 이상 입력해 주세요.",
    "err.dupOptions": "같은 선택지를 중복해서 쓸 수 없습니다.",
    "err.minTwoOptions": "선택지는 2개 이상 필요합니다.",

    "opt.title": "선택지", "opt.range": "2–10개", "opt.presetYesNo": "찬성 · 반대", "opt.presetScale": "1–5 척도",
    "opt.presetYes": "찬성", "opt.presetNo": "반대", "opt.addOption": "＋ 선택지 추가", "opt.placeholder": "선택지 내용을 입력하세요",
    "opt.removeLabel": "선택지 삭제",

    "form.editSuffix": "수정", "form.editHint": "내용을 고치고 저장하면 모두에게 바로 반영됩니다.",
    "form.close": "닫기",

    "notice.kicker": "Notice", "notice.title": "공지 작성", "notice.desc": "모든 학회원에게 바로 전달됩니다.", "notice.submit": "공지 게시하기",
    "notice.f.title": "공지 제목", "notice.f.titlePh": "예: 2학기 정기 모임 시간 확정",
    "notice.f.body": "공지 내용", "notice.f.bodyPh": "학회원에게 전달할 내용을 구체적으로 적어주세요",
    "notice.f.pinned": "중요 공지로 고정", "notice.f.pinnedNote": "목록 맨 위에 고정합니다.",
    "notice.f.signup": "참여 신청 받기", "notice.f.signupNote": "학회원이 참여 여부를 누를 수 있고, 명단이 쌓입니다.",
    "notice.f.startAt": "일시", "notice.f.startAtHint": "선택 · 입력하면 학회 캘린더에 자동 등록",
    "notice.f.location": "장소", "notice.f.locationHint": "선택", "notice.f.locationPh": "예: 학생회관 302호",
    "notice.f.capacity": "정원", "notice.f.capacityHint": "선택 · 0이면 제한 없음",
    "notice.posted": "공지를 게시했습니다.",

    "schedule.kicker": "Schedule", "schedule.title": "일정 등록", "schedule.desc": "정기 모임·소모임·세미나 일정을 캘린더에 올립니다.", "schedule.submit": "일정 등록하기",
    "schedule.f.title": "일정 제목", "schedule.f.titlePh": "예: 정기 세미나 6주차",
    "schedule.f.startAt": "날짜와 시간", "schedule.f.location": "장소", "schedule.f.locationHint": "선택",
    "schedule.f.locationPh": "예: 학생회관 302호 또는 온라인",
    "schedule.f.body": "일정 내용", "schedule.f.bodyPh": "다룰 주제와 준비 사항을 적어주세요",
    "schedule.posted": "일정을 등록했습니다.", "schedule.postedWithGcalHint": "일정을 등록했습니다. 목록의 '구글에 추가'를 누르면 구글 캘린더에도 올라갑니다.",

    "activity.kicker": "Session", "activity.title": "활동 기록", "activity.desc": "무엇을 다뤘고 몇 명이 함께했는지 남깁니다.", "activity.submit": "기록 추가하기",
    "activity.f.content": "활동 내용", "activity.f.contentPh": "예: 통화정책 세미나 — 금리 인하 사이클이 환율에 미치는 경로 정리",
    "activity.f.category": "주제 트랙", "activity.f.date": "날짜", "activity.f.headcount": "참여 인원", "activity.f.headcountPh": "명",
    "activity.posted": "활동을 기록했습니다.",

    "material.kicker": "Archive", "material.title": "자료 등록", "material.desc": "자료나 데이터 노트 링크를 등록하고 태그로 분류하세요.", "material.submit": "자료 등록하기",
    "material.f.name": "자료 이름", "material.f.namePh": "예: 세미나 자료 템플릿",
    "material.f.url": "링크", "material.f.tags": "태그", "material.f.tagsHint": "쉼표로 구분", "material.f.tagsPh": "예: 세미나, 통화정책",
    "material.posted": "자료를 등록했습니다.",

    "idea.kicker": "Suggestion", "idea.title": "건의하기", "idea.desc": "학회에 바라는 점을 자유롭게 적어주세요. 다른 학회원이 공감하고 운영진이 답합니다.", "idea.submit": "건의 올리기",
    "idea.f.title": "건의 제목", "idea.f.titlePh": "예: 발표 자료 마감을 하루 앞당기면 좋겠습니다",
    "idea.f.body": "건의 내용", "idea.f.bodyPh": "어떤 점이 아쉬웠고, 어떻게 바뀌면 좋을지 적어주세요",
    "idea.posted": "건의를 올렸습니다.",

    "poll.kicker": "Vote", "poll.title": "새 투표 열기", "poll.desc": "모두가 판단할 수 있도록 안건과 기한을 분명하게 적어주세요.", "poll.submit": "투표 시작하기",
    "poll.f.title": "투표 제목", "poll.f.titlePh": "예: 2학기 국가별 주제 선정",
    "poll.f.content": "투표 내용", "poll.f.contentPh": "배경, 결정할 내용, 참고 사항을 적어주세요",
    "poll.f.deadline": "투표 종료 기한", "poll.f.multi": "복수 선택 허용", "poll.f.multiNote": "켜면 한 사람이 여러 항목을 고를 수 있습니다.",
    "poll.posted": "투표를 시작했습니다.",

    "term.title": "학기와 진행률", "term.desc": "사이드바에 표시되는 학기 정보를 바꿉니다.",
    "term.f.name": "학기 이름", "term.f.namePh": "예: 2026 2학기",
    "term.f.progress": "진행률 (%)", "term.f.note": "부가 설명", "term.f.notePh": "예: 정기 모임 12주 중 5주차",

    "goal.title": "이번 학기 방향", "goal.desc": "홈 화면 맨 위에 크게 표시됩니다.",
    "goal.f.lead": "앞 문장", "goal.f.leadPh": "예: 시장을 읽고",
    "goal.f.accent": "강조 문장", "goal.f.accentPh": "예: 우리의 언어로 쓴다",
    "goal.f.note": "설명", "goal.f.count": "핵심 목표 개수", "goal.f.countPh": "예: 04",
    "home.goalLabel": "이번 학기 방향", "home.coreGoals": "핵심 목표",

    "cat.경제": "경제", "cat.비즈니스": "비즈니스", "cat.국가별 주제": "국가별 주제", "cat.기타": "기타",

    "nav.home.label": "홈", "nav.home.title": "좋은 하루예요.",
    "nav.activities.label": "활동", "nav.activities.title": "이번 주 활동을 기록해 볼까요?",
    "nav.calendar.label": "일정", "nav.calendar.title": "다가오는 일정을 확인하세요.",
    "nav.notices.label": "공지", "nav.notices.title": "새로운 소식이 도착했어요.",
    "nav.votes.label": "투표", "nav.votes.title": "우리의 결정을 모아보세요.",
    "nav.ideas.label": "건의", "nav.ideas.title": "학회에 바라는 점을 들려주세요.",
    "nav.archive.label": "자료실", "nav.archive.title": "기록이 쌓이면 자산이 됩니다.",
    "nav.office.label": "운영실", "nav.office.title": "학회의 방향을 설계하세요.",

    "lang.switchTo": "EN"
  },

  en: {
    "brand.name": "Sejong Finance Association",
    "gate.lead": "Members only.<br>Please sign in with your Google account.",
    "gate.switchAccount": "Sign in with a different account",
    "gate.foot": "Signing in submits a membership request. Once an officer approves it, you're in.",
    "gate.pendingTitle": "Your request is pending",
    "gate.pendingBody": "We've received your membership request. You'll get full access as soon as an officer approves it.",
    "gate.rejectedTitle": "Your request wasn't approved",
    "gate.rejectedBody": "Please contact an officer.",
    "gate.setupTitle": "Setup isn't finished yet",
    "gate.setupBody": "The Google client ID and session secret aren't configured, so sign-in isn't available.",
    "gate.googleLoadFail": "Couldn't load Google Sign-In. Please refresh the page.",

    "common.seeAll": "See all", "common.refresh": "Refresh", "common.edit": "Edit", "common.delete": "Delete",
    "common.cancel": "Cancel", "common.confirm": "OK", "common.close": "Close", "common.save": "Save",
    "common.saved": "Saved.", "common.loading": "Loading…", "common.connected": "Connected",
    "common.loadFailed": "Couldn't load", "common.none": "—", "common.location": "Location TBD",

    "home.roadmap": "See the roadmap →", "home.upcoming": "Upcoming", "home.recentActivities": "Recent activities",
    "home.newNotices": "Latest notices", "home.activePolls": "Open polls",
    "home.noUpcoming": "Nothing coming up yet.", "home.noActivities": "No activities logged yet.",
    "home.noNotices": "No notices posted yet.", "home.noPolls": "No polls running right now.",
    "home.attendees": " going", "home.deadline": " left", "home.applied": " signed up", "home.capacitySlash": " / cap ",
    "home.allDay": " · All day",

    "activities.title": "Activity Log", "activities.desc": "Log what you did and how many showed up — your end-of-term report writes itself.",
    "activities.newBtn": "Log activity", "activities.tracks": "Activities are tagged Economics, Business, or Country-specific topics.",
    "activities.count": " logged", "activities.empty.title": "No activities yet",
    "activities.empty.body": "Log your first activity and it'll show up here.", "activities.dateLabel": "Date", "activities.attendLabel": "Attendance",

    "calendar.title": "Club Calendar", "calendar.desc": "Google Calendar events and events added in the app, together.",
    "calendar.openGoogle": "Open in Google Calendar ↗", "calendar.newBtn": "Add event", "calendar.sharedName": "Shared club calendar",
    "calendar.checking": "Checking…", "calendar.hint": "Add or edit events in Google Calendar and they'll show up here right away. Signed in with an account that has access to the club calendar? You'll see full event titles.",
    "calendar.inApp": "Events added in the app", "calendar.liveSync": "Live", "calendar.notSynced": "Not connected",
    "calendar.empty": "No events added in the app. Most events are managed in Google Calendar above.",
    "calendar.addToGoogle": "Add to Google Calendar ↗", "calendar.googleBadge": "Google", "calendar.reloaded": "Reloaded Google Calendar.",

    "notices.title": "News & Decisions", "notices.desc": "Pin important notices so nobody misses them.",
    "notices.newBtn": "Post notice", "notices.pinned": "Pinned", "notices.plain": "Notice", "notices.signupBadge": "Sign-up",
    "notices.empty.title": "No notices yet", "notices.empty.body": "Officer posts will show up here.",
    "notices.pastEvent": "Past event", "notices.joinCancel": "Cancel RSVP", "notices.joinClosed": "Closed",
    "notices.joinFull": "Full", "notices.join": "I'm in", "notices.people": "", "notices.noParticipants": "No one's signed up yet.",
    "notices.joined": "You're signed up.", "notices.left": "RSVP cancelled.",

    "votes.title": "Decide Together", "votes.desc": "Read the proposal, cast your vote, and share why.",
    "votes.newBtn": "Open a poll", "votes.hint": "Officers open polls. You can change your vote until it closes.",
    "votes.inProgress": "Open", "votes.ended": "Closed", "votes.multiBadge": "Multi-select",
    "votes.empty.title": "No polls open yet", "votes.empty.body": "When an officer opens one, you can vote here.",
    "votes.currentJoined": "", "votes.peopleJoined": " voted so far", "votes.totalVotes": " · ", "votes.votesSuffix": " votes total",
    "votes.myChoice": "Your pick: ", "votes.notChosenYet": "You haven't voted yet", "votes.discuss": "Discussion",
    "votes.showComments": "Show comments", "votes.hideComments": "Hide comments", "votes.firstComment": "Be the first to comment.",
    "votes.neutral": "Neutral / question", "votes.commentPh": "Share your reasoning or ask a question, respectfully",
    "votes.post": "Post", "votes.openedBy": "Opened by ", "votes.selectedNote": "Selected — tap again to remove",
    "votes.endedNote": "Poll closed", "votes.addToSelection": "Add to selection", "votes.voteThis": "Vote this option",
    "votes.reflected": "Your vote was recorded.",

    "ideas.title": "Suggestions", "ideas.desc": "Tell us what you'd like to see change. Officers review the most-upvoted ideas first.",
    "ideas.newBtn": "Suggest something", "ideas.hint": "Upvote a suggestion to back it.",
    "ideas.count": " suggestions", "ideas.empty.title": "No suggestions yet",
    "ideas.empty.body": "Be the first to share what you'd like to see.", "ideas.noReplies": "No replies yet.",
    "ideas.like": "Upvote", "ideas.showReplies": "", "ideas.repliesShown": " replies — hide", "ideas.repliesHidden": " replies",
    "ideas.replyPh": "Add a reply or comment", "ideas.replyPosted": "Reply posted.",
    "ideas.statusChanged": "Status updated.",

    "archive.title": "Resources", "archive.desc": "Your Google Drive folder, embedded here. Click a file to open it in Drive.",
    "archive.openDrive": "Open in Drive ↗", "archive.sharedFolder": "Shared club folder",
    "archive.driveHint": "Nothing showing? Check that the folder is shared in Drive with <b>Anyone with the link</b>.",
    "archive.linksTitle": "Other links", "archive.linksDesc": "Collect resources outside Drive, tagged for easy searching.",
    "archive.newBtn": "Add a link", "archive.search": "Search by name or tag",
    "archive.noFolder": "No Drive folder configured yet.", "archive.reloaded": "Reloading the Drive folder.",
    "archive.noResults": "No results", "archive.noResultsBody": "Try a different name or tag.",
    "archive.empty": "No resources yet", "archive.emptyBody": "Add a link and tag it to get started.",

    "office.title": "Officer Room", "office.desc": "Manage the term's direction, research tracks, and membership approvals.",
    "office.members": "Membership requests", "office.roadmap": "Term roadmap", "office.topics": "Research tracks",
    "office.recruit": "Recruiting", "office.settings": "Term settings", "office.termSettings": "Term & progress",
    "office.goalSettings": "This term's focus", "office.planning": "Planning", "office.term": "This term",
    "office.stateDone": "Done", "office.stateNow": "In progress", "office.stateNext": "Upcoming", "office.unset": "TBD",
    "office.notSet": "Not set", "office.noApplicants": "No membership requests yet.", "office.waiting": " pending",
    "office.approve": "Approve", "office.reject": "Reject", "office.approved": "Approved as a member.",
    "office.rejected": "Membership request declined.",
    "office.founder": "Founder", "office.officer": "Officer",
    "office.makeOfficer": "Make officer", "office.revokeOfficer": "Remove officer",
    "office.revokeConfirm": "Remove this member's officer role? They'll stay on as a regular member.",
    "office.officerAssigned": "Made an officer.", "office.officerRevoked": "Officer role removed.",
    "office.recruitEdit": "Edit recruiting info", "office.roadmapEdit": "Edit roadmap",
    "office.roadmapAdd": "＋ Add step", "office.roadmapRemove": "Remove step",
    "office.roadmapNoTitle": "Add at least one step with a title.",
    "office.roadmapSaved": "Roadmap saved.", "office.recruitSaved": "Recruiting info saved.",

    "role.admin": "Officer", "role.member": "Member", "role.pending": "Pending approval", "role.rejected": "Not approved", "role.visitor": "Visitor",
    "memberStatus.pending": "Pending", "memberStatus.approved": "Approved", "memberStatus.rejected": "Rejected",
    "ideaStatus.open": "Received", "ideaStatus.reviewing": "In review", "ideaStatus.done": "Adopted", "ideaStatus.closed": "Closed",

    "confirm.deleteTitle": "Delete", "confirm.deleteMsg": "This removes it for every member. It can't be undone.",
    "confirm.deleteBtn": "Delete", "confirm.deleted": "Deleted.",
    "label.notices": "notice", "label.schedules": "event", "label.activities": "activity log",
    "label.votes": "poll", "label.materials": "resource", "label.ideas": "suggestion",

    "err.needTitleBody": "Please fill in both the title and the body.",
    "err.needDateTime": "Please choose a date and time.",
    "err.needActivityContent": "Please describe the activity.",
    "err.needActivityDate": "Please choose a date.",
    "err.needHeadcount": "Attendance must be at least 1.",
    "err.needMaterialName": "Please enter a name for the resource.",
    "err.needValidUrl": "The link must start with http:// or https://",
    "err.needDeadline": "Please choose a closing date.",
    "err.deadlineFuture": "The closing date must be in the future.",
    "err.needTwoOptions": "Please add at least 2 options.",
    "err.dupOptions": "Options can't repeat.",
    "err.minTwoOptions": "A poll needs at least 2 options.",

    "opt.title": "Options", "opt.range": "2–10", "opt.presetYesNo": "Yes · No", "opt.presetScale": "1–5 scale",
    "opt.presetYes": "Yes", "opt.presetNo": "No", "opt.addOption": "＋ Add option", "opt.placeholder": "Option text",
    "opt.removeLabel": "Remove option",

    "form.editSuffix": "Edit", "form.editHint": "Update it and save — changes go live for everyone immediately.",
    "form.close": "Close",

    "notice.kicker": "Notice", "notice.title": "Post a Notice", "notice.desc": "Goes out to every member right away.", "notice.submit": "Post notice",
    "notice.f.title": "Title", "notice.f.titlePh": "e.g. Term 2 weekly meeting time confirmed",
    "notice.f.body": "Body", "notice.f.bodyPh": "Write out what members need to know",
    "notice.f.pinned": "Pin to the top", "notice.f.pinnedNote": "Keeps it at the top of the list.",
    "notice.f.signup": "Collect RSVPs", "notice.f.signupNote": "Members can RSVP, and you'll see who's coming.",
    "notice.f.startAt": "Date & time", "notice.f.startAtHint": "optional — adds it to the club calendar automatically",
    "notice.f.location": "Location", "notice.f.locationHint": "optional", "notice.f.locationPh": "e.g. Student Union Rm 302",
    "notice.f.capacity": "Capacity", "notice.f.capacityHint": "optional — 0 means unlimited",
    "notice.posted": "Notice posted.",

    "schedule.kicker": "Schedule", "schedule.title": "Add an Event", "schedule.desc": "Add a meeting, study group, or seminar to the calendar.", "schedule.submit": "Add event",
    "schedule.f.title": "Title", "schedule.f.titlePh": "e.g. Weekly seminar, week 6",
    "schedule.f.startAt": "Date & time", "schedule.f.location": "Location", "schedule.f.locationHint": "optional",
    "schedule.f.locationPh": "e.g. Student Union Rm 302, or online",
    "schedule.f.body": "Details", "schedule.f.bodyPh": "What's the topic, and what should people bring or prepare?",
    "schedule.posted": "Event added.", "schedule.postedWithGcalHint": "Event added. Tap “Add to Google Calendar” in the list to put it on the calendar too.",

    "activity.kicker": "Session", "activity.title": "Log an Activity", "activity.desc": "Note what you covered and how many people showed up.", "activity.submit": "Add to log",
    "activity.f.content": "What happened", "activity.f.contentPh": "e.g. Monetary policy seminar — mapped how rate cuts feed through to FX",
    "activity.f.category": "Track", "activity.f.date": "Date", "activity.f.headcount": "Attendance", "activity.f.headcountPh": "people",
    "activity.posted": "Activity logged.",

    "material.kicker": "Archive", "material.title": "Add a Resource", "material.desc": "Link a document or dataset and tag it.", "material.submit": "Add resource",
    "material.f.name": "Name", "material.f.namePh": "e.g. Seminar slide template",
    "material.f.url": "Link", "material.f.tags": "Tags", "material.f.tagsHint": "comma-separated", "material.f.tagsPh": "e.g. seminar, monetary policy",
    "material.posted": "Resource added.",

    "idea.kicker": "Suggestion", "idea.title": "Share a Suggestion", "idea.desc": "Tell us what you'd like to see change. Members can upvote, and officers reply.", "idea.submit": "Post suggestion",
    "idea.f.title": "Title", "idea.f.titlePh": "e.g. Move the slide deadline up by a day",
    "idea.f.body": "Details", "idea.f.bodyPh": "What's not working, and what would help?",
    "idea.posted": "Suggestion posted.",

    "poll.kicker": "Vote", "poll.title": "Open a Poll", "poll.desc": "Spell out the proposal and deadline clearly so everyone can decide.", "poll.submit": "Start poll",
    "poll.f.title": "Poll title", "poll.f.titlePh": "e.g. Choose this term's country-specific topic",
    "poll.f.content": "Details", "poll.f.contentPh": "Give the background, what's being decided, and anything else people should know",
    "poll.f.deadline": "Closes at", "poll.f.multi": "Allow multiple selections", "poll.f.multiNote": "Lets each person pick more than one option.",
    "poll.posted": "Poll opened.",

    "term.title": "Term & Progress", "term.desc": "Shown in the sidebar.",
    "term.f.name": "Term name", "term.f.namePh": "e.g. Fall 2026",
    "term.f.progress": "Progress (%)", "term.f.note": "Note", "term.f.notePh": "e.g. Week 5 of 12",

    "goal.title": "This Term's Focus", "goal.desc": "Shown large at the top of the home page.",
    "goal.f.lead": "First line", "goal.f.leadPh": "e.g. Read the market,",
    "goal.f.accent": "Emphasis line", "goal.f.accentPh": "e.g. write it in our own words",
    "goal.f.note": "Description", "goal.f.count": "Core goal count", "goal.f.countPh": "e.g. 04",
    "home.goalLabel": "This Term's Focus", "home.coreGoals": "Core Goals",

    "cat.경제": "Economics", "cat.비즈니스": "Business", "cat.국가별 주제": "Country topics", "cat.기타": "Other",

    "nav.home.label": "Home", "nav.home.title": "Have a good day.",
    "nav.activities.label": "Activities", "nav.activities.title": "Log this week's activity?",
    "nav.calendar.label": "Calendar", "nav.calendar.title": "Check what's coming up.",
    "nav.notices.label": "Notices", "nav.notices.title": "New updates are in.",
    "nav.votes.label": "Votes", "nav.votes.title": "Have your say.",
    "nav.ideas.label": "Suggestions", "nav.ideas.title": "Tell us what you'd like to see.",
    "nav.archive.label": "Resources", "nav.archive.title": "Every record adds up.",
    "nav.office.label": "Officer Room", "nav.office.title": "Shape the club's direction.",

    "lang.switchTo": "한국어"
  }
};
function t(key) {
  const bucket = STR[LANG];
  if (bucket && Object.prototype.hasOwnProperty.call(bucket, key)) return bucket[key];
  if (Object.prototype.hasOwnProperty.call(STR.ko, key)) return STR.ko[key];
  return key;
}

/* ---- 데이터 값(값 자체가 고정된 어휘)의 큐레이션 번역 — API 호출 없이 즉시 처리 ---- */
const CURATED_EN = {
  "일": "Sun", "월": "Mon", "화": "Tue", "수": "Wed", "목": "Thu", "금": "Fri", "토": "Sat",
  "경제": "Economics", "비즈니스": "Business", "국가별 주제": "Country topics", "기타": "Other",
  "장소 미정": "Location TBD", "구글 캘린더": "Google Calendar", "온라인": "Online",
  "찬성": "Agree", "반대": "Disagree", "중립·질문": "Neutral / question",
  "운영진": "Officer(s)", "학회원": "Member(s)", "참여자": "Participant(s)", "방문자": "Visitor",
  "완료": "Done", "진행 중": "In progress", "예정": "Upcoming", "계획 중": "Planning",
  "중요": "Pinned", "공지": "Notice", "모집": "Sign-up", "종료": "Closed", "복수 선택": "Multi-select",
  "미정": "TBD", "미설정": "Not set"
};
function curated(text) { return CURATED_EN[text]; }

/* ---- 동적(사용자 작성) 콘텐츠 번역: 서버의 구글 번역 API + D1 캐시를 통해 처리 ---- */
const LATIN_RE = /[a-zA-Z]{3,}/;
const TR = Object.create(null); // key: LANG + "|" + 원문
function eligible(s) {
  // 이 언어 화면에서 번역이 필요한 문자열인가
  return LANG === "en" ? hasHangul(s) : (!hasHangul(s) && LATIN_RE.test(s));
}
function tx(text) {
  if (text == null || text === "") return text == null ? "" : text;
  const s = String(text);
  if (LANG === "en") {
    const c = curated(s); if (c !== undefined) return c;
  }
  if (!eligible(s)) return s;
  const key = LANG + "|" + s;
  return TR[key] !== undefined ? TR[key] : s;
}
async function translateBatch(list) {
  const target = LANG === "en" ? "en" : "ko";
  const need = Array.from(new Set((list || []).filter(Boolean).map(String)))
    .filter(s => eligible(s) && (LANG !== "en" || curated(s) === undefined) && TR[LANG + "|" + s] === undefined);
  if (!need.length) return;
  try {
    const data = await api("/api/translate", { method: "POST", body: JSON.stringify({ texts: need, target }) });
    const out = data.translations || [];
    need.forEach((s, i) => { TR[LANG + "|" + s] = out[i] != null ? out[i] : s; });
  } catch (e) { /* 실패해도 원문으로 조용히 진행 */ }
}
/* 학회원(외국인 포함)이 실제로 작성한 콘텐츠만 — 두 방향 다 번역 대상 */
function collectUserContentStrings() {
  const out = [];
  S.notices.forEach(n => { out.push(n.title, n.body); if (n.location) out.push(n.location); });
  S.schedules.forEach(s => { out.push(s.title, s.body); if (s.location) out.push(s.location); });
  S.activities.forEach(a => out.push(a.content));
  S.materials.forEach(m => { out.push(m.name); (m.tags || []).forEach(x => out.push(x)); });
  S.polls.forEach(p => { out.push(p.title, p.content); p.options.forEach(o => out.push(o.label)); });
  S.ideas.forEach(i => out.push(i.title, i.body));
  return out;
}
/* 운영진이 정한 사이트 문구(학기 방향·로드맵·리크루팅 등) — 운영진이 고른 언어를 그대로 존중.
   EN 토글(한→영)에서만 도와주고, 기본 한국어 화면에서 영→한으로 되돌리지는 않는다. */
function collectSettingsStrings() {
  const out = [];
  const st = S.settings || {};
  if (st.term) out.push(st.term.name, st.term.note);
  if (st.goal) out.push(st.goal.lead, st.goal.accent, st.goal.note);
  (st.roadmap || []).forEach(r => out.push(r.title, r.when));
  (st.topics || []).forEach(x => out.push(x.title, x.detail));
  if (st.recruit) out.push(st.recruit.period, st.recruit.eligibility, st.recruit.process, st.recruit.contact);
  return out;
}
function collectDynamicStrings() {
  return collectUserContentStrings().concat(
    LANG === "en" ? collectSettingsStrings() : []
  );
}
function collectGcalStrings() {
  return (S.gcal.events || []).flatMap(e => [e.title, e.body, e.location].filter(Boolean));
}
function errText(msg) {
  if (LANG !== "en") return msg;
  const KEY_BY_KO = {
    "공지 제목과 내용을 확인해 주세요.": "err.needTitleBody",
    "제목과 내용을 확인해 주세요.": "err.needTitleBody",
    "공지를 찾을 수 없습니다.": null, "구글 로그인 확인에 실패했습니다.": null,
    "구글 로그인이 필요합니다.": null, "답변 내용을 입력해 주세요.": null,
    "데이터베이스가 연결되지 않았습니다.": null, "상태 값을 확인해 주세요.": null,
    "서로 다른 선택지를 2–10개 입력해 주세요.": "err.needTwoOptions",
    "선택지를 확인해 주세요.": null, "승인 상태를 확인해 주세요.": null,
    "안건과 종료 기한을 확인해 주세요.": "err.needTitleBody",
    "요청을 찾을 수 없습니다.": null, "요청을 처리하는 중 문제가 생겼습니다.": null,
    "운영진 승인 후 이용할 수 있습니다.": null, "운영진만 할 수 있습니다.": null,
    "의견 내용을 입력해 주세요.": null, "의견 선택지를 확인해 주세요.": null,
    "일시를 확인해 주세요.": null, "일정 제목, 내용, 날짜를 확인해 주세요.": "err.needTitleBody",
    "자료 이름과 http(s) 링크를 확인해 주세요.": "err.needValidUrl",
    "작성자와 운영진만 삭제할 수 있습니다.": null, "작성자와 운영진만 수정할 수 있습니다.": null,
    "정원이 모두 찼습니다.": null, "종료된 투표에는 의견을 남길 수 없습니다.": null,
    "종료된 투표입니다.": null, "참여 신청을 받지 않는 공지입니다.": null,
    "투표를 찾을 수 없습니다.": null, "항목을 찾을 수 없습니다.": null,
    "활동 내용, 날짜와 인원을 확인해 주세요.": "err.needActivityContent",
    "역할 값을 확인해 주세요.": null,
    "승인된 학회원만 운영진으로 지정할 수 있습니다.": null,
    "코드에 등록된 최초 운영진은 여기서 해제할 수 없습니다.": null,
    "본인의 운영진 권한은 스스로 해제할 수 없습니다. 다른 운영진에게 요청해 주세요.": null
  };
  const EN_FALLBACK = {
    "공지를 찾을 수 없습니다.": "Notice not found.",
    "구글 로그인 확인에 실패했습니다.": "Google sign-in verification failed.",
    "구글 로그인이 필요합니다.": "Please sign in with Google.",
    "답변 내용을 입력해 주세요.": "Please write a reply.",
    "데이터베이스가 연결되지 않았습니다.": "Database isn't connected.",
    "상태 값을 확인해 주세요.": "Please check the status value.",
    "선택지를 확인해 주세요.": "Please check the option.",
    "승인 상태를 확인해 주세요.": "Please check the approval status.",
    "요청을 찾을 수 없습니다.": "Not found.",
    "요청을 처리하는 중 문제가 생겼습니다.": "Something went wrong processing that.",
    "운영진 승인 후 이용할 수 있습니다.": "You'll get access once an officer approves your membership.",
    "운영진만 할 수 있습니다.": "Only officers can do that.",
    "의견 내용을 입력해 주세요.": "Please write a comment.",
    "의견 선택지를 확인해 주세요.": "Please check the comment's option.",
    "일시를 확인해 주세요.": "Please check the date and time.",
    "작성자와 운영진만 삭제할 수 있습니다.": "Only the author or an officer can delete this.",
    "작성자와 운영진만 수정할 수 있습니다.": "Only the author or an officer can edit this.",
    "정원이 모두 찼습니다.": "This is full.",
    "종료된 투표에는 의견을 남길 수 없습니다.": "This poll is closed to new comments.",
    "종료된 투표입니다.": "This poll is closed.",
    "참여 신청을 받지 않는 공지입니다.": "This notice isn't collecting RSVPs.",
    "투표를 찾을 수 없습니다.": "Poll not found.",
    "항목을 찾을 수 없습니다.": "Item not found.",
    "역할 값을 확인해 주세요.": "Please check the role value.",
    "승인된 학회원만 운영진으로 지정할 수 있습니다.": "Only approved members can be made officers.",
    "코드에 등록된 최초 운영진은 여기서 해제할 수 없습니다.": "This founding officer is set in the code and can't be removed here.",
    "본인의 운영진 권한은 스스로 해제할 수 없습니다. 다른 운영진에게 요청해 주세요.": "You can't remove your own officer role. Ask another officer to do it."
  };
  if (Object.prototype.hasOwnProperty.call(KEY_BY_KO, msg)) {
    const key = KEY_BY_KO[msg];
    if (key) return t(key);
    if (EN_FALLBACK[msg]) return EN_FALLBACK[msg];
  }
  return msg;
}

/* ---- 정적 DOM 문구 적용 ---- */
function applyStaticI18n() {
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.getAttribute("data-i18n")); });
  document.querySelectorAll("[data-i18n-html]").forEach(el => { el.innerHTML = t(el.getAttribute("data-i18n-html")); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => { el.placeholder = t(el.getAttribute("data-i18n-placeholder")); });
}
function setLangToggleLabel() {
  document.querySelectorAll(".lang-toggle").forEach(el => { el.textContent = t("lang.switchTo"); });
}
function toggleLang() {
  const next = LANG === "en" ? "ko" : "en";
  try { localStorage.setItem("sfa.lang", next); } catch (e) {}
  location.reload();
}

/* ---------------- helpers ---------------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = t2 => { const d = document.createElement("div"); d.textContent = t2 == null ? "" : String(t2); return d.innerHTML; };
const pad = n => String(n).padStart(2, "0");
const WD_KO = ["일", "월", "화", "수", "목", "금", "토"];
const WD_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WD = () => (LANG === "en" ? WD_EN : WD_KO);

const toDate = s => { if (!s) return null; const d = new Date(s); return isNaN(d) ? null : d; };
const dayKey = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const localInput = d => dayKey(d) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());

function fmtDay(s) {
  const d = toDate(s); if (!d) return "";
  if (LANG === "en") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (d.getMonth() + 1) + "월 " + d.getDate() + "일";
}
function fmtFull(s) {
  const d = toDate(s); if (!d) return "";
  if (LANG === "en") return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  return d.getFullYear() + ". " + pad(d.getMonth() + 1) + ". " + pad(d.getDate());
}
function fmtTime(s) {
  const d = toDate(s); if (!d) return "";
  if (LANG === "en") return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const h = d.getHours();
  return (h < 12 ? "오전" : "오후") + " " + (h % 12 === 0 ? 12 : h % 12) + ":" + pad(d.getMinutes());
}
function fmtShort(s) {
  const d = toDate(s); if (!d) return "";
  if (LANG === "en") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (d.getMonth() + 1) + "." + d.getDate();
}
function ago(s) {
  const d = toDate(s); if (!d) return "";
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (LANG === "en") {
    if (m < 1) return "just now"; if (m < 60) return m + "m ago";
    const h = Math.round(m / 60); if (h < 24) return h + "h ago";
    const dy = Math.round(h / 24); return dy < 7 ? dy + "d ago" : fmtShort(s);
  }
  if (m < 1) return "방금"; if (m < 60) return m + "분 전";
  const h = Math.round(m / 60); if (h < 24) return h + "시간 전";
  const dy = Math.round(h / 24); return dy < 7 ? dy + "일 전" : fmtShort(s);
}
function left(s) {
  const d = toDate(s);
  if (LANG === "en") {
    if (!d) return "Closed";
    const ms = d.getTime() - Date.now(); if (ms <= 0) return "Closed";
    const h = Math.ceil(ms / 3600000);
    return h < 24 ? h + "h left" : Math.ceil(h / 24) + "d left";
  }
  if (!d) return "종료됨";
  const ms = d.getTime() - Date.now(); if (ms <= 0) return "종료됨";
  const h = Math.ceil(ms / 3600000);
  return h < 24 ? h + "시간 남음" : Math.ceil(h / 24) + "일 남음";
}
const ended = s => { const d = toDate(s); return !d || d.getTime() <= Date.now(); };
const trim = (t2, n) => { t2 = String(t2 || ""); return t2.length > n ? t2.slice(0, n) + "…" : t2; };

/* 받침 유무에 따라 을/를 선택 (한국어일 때만 사용) */
function objParticle(word) {
  const last = String(word || "").slice(-1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "를";
  return (code - 0xac00) % 28 === 0 ? "를" : "을";
}

/* 브라우저 confirm() 대신 앱 안에서 뜨는 확인창.
   크롬이 대화상자를 차단해도 영향받지 않는다. */
function askConfirm(opts) {
  return new Promise(function (resolve) {
    const root = document.getElementById("confirm-root");
    root.innerHTML =
      '<div class="scrim"><div class="sheet confirm-sheet" role="alertdialog" aria-modal="true">' +
      '<h2>' + esc(opts.title) + "</h2>" +
      "<p>" + esc(opts.message) + "</p>" +
      '<div class="confirm-actions">' +
      '<button class="btn" data-no>' + esc(t("common.cancel")) + '</button>' +
      '<button class="btn primary" data-yes>' + esc(opts.confirmLabel || t("common.confirm")) + "</button>" +
      "</div></div></div>";

    const scrim = root.querySelector(".scrim");
    const done = function (v) {
      root.innerHTML = "";
      document.removeEventListener("keydown", onKey);
      resolve(v);
    };
    function onKey(e) {
      if (e.key === "Escape") done(false);
      if (e.key === "Enter") done(true);
    }
    document.addEventListener("keydown", onKey);
    root.querySelector("[data-no]").addEventListener("click", function () { done(false); });
    root.querySelector("[data-yes]").addEventListener("click", function () { done(true); });
    scrim.addEventListener("mousedown", function (e) { if (e.target === scrim) done(false); });
    setTimeout(function () { root.querySelector("[data-yes]").focus(); }, 20);
  });
}

let toastTimer = null;
function toast(msg) {
  const t2 = $("#toast"); t2.textContent = errText(msg); t2.classList.add("on");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t2.classList.remove("on"), 2800);
}
function setChip(tone, text) { const c = $("#save-chip"); c.dataset.tone = tone; $("#save-text").textContent = text; }

/* ---------------- api ---------------- */
async function api(path, options) {
  options = options || {};
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    ...options
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const err = new Error(payload.error || "요청을 처리하지 못했습니다.");
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? {} : res.json();
}

/* ---------------- state ---------------- */
const S = {
  me: null, settings: null,
  notices: [], schedules: [], activities: [], polls: [], materials: [], members: [], ideas: [], gcal: { configured: false, events: [] },
  loaded: {}
};
const isAdmin = () => S.me && S.me.role === "admin";

/* ---------------- gate ---------------- */
const ROLE_LABEL = { admin: "role.admin", member: "role.member", pending: "role.pending", rejected: "role.rejected", visitor: "role.visitor" };

function revealApp() {
  return new Promise(resolve => {
    const gate = $("#gate"), app = $("#app");
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      gate.hidden = true; app.hidden = false;
      resolve();
      return;
    }
    gate.classList.add("leaving");
    setTimeout(() => {
      gate.hidden = true;
      gate.classList.remove("leaving");
      app.hidden = false;
      app.classList.add("entering");
      app.addEventListener("animationend", () => app.classList.remove("entering"), { once: true });
      resolve();
    }, 420);
  });
}

function showGate(mode, detail) {
  $("#gate").classList.remove("leaving");
  $("#app").classList.remove("entering");
  $("#gate").hidden = false;
  $("#app").hidden = true;
  const status = $("#gate-status"), gsi = $("#gsi-button"), out = $("#gate-logout");
  const lead = $("#gate-lead");
  status.hidden = true; gsi.hidden = true; out.hidden = true;

  if (mode === "login") {
    gsi.hidden = false;
    lead.innerHTML = t("gate.lead");
  } else if (mode === "pending") {
    lead.textContent = detail || "";
    status.hidden = false;
    status.innerHTML = "<b>" + esc(t("gate.pendingTitle")) + "</b>" + esc(t("gate.pendingBody"));
    out.hidden = false;
  } else if (mode === "rejected") {
    lead.textContent = detail || "";
    status.hidden = false;
    status.innerHTML = "<b>" + esc(t("gate.rejectedTitle")) + "</b>" + esc(t("gate.rejectedBody"));
    out.hidden = false;
  } else if (mode === "setup") {
    lead.textContent = "";
    status.hidden = false;
    status.innerHTML = "<b>" + esc(t("gate.setupTitle")) + "</b>" + esc(t("gate.setupBody"));
  }
}

async function doLogout() {
  await api("/api/auth/logout", { method: "POST" }).catch(() => {});
  location.reload();
}
$("#gate-logout").addEventListener("click", doLogout);
$("#logout").addEventListener("click", doLogout);
$("#gate-lang-toggle").addEventListener("click", toggleLang);
$("#lang-toggle").addEventListener("click", toggleLang);

async function onCredential(response) {
  try {
    await api("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential: response.credential })
    });
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const art = $(".gate-art");
    if (art && !reduced) {
      art.classList.add("charging");
      setTimeout(() => location.reload(), 1150);
    } else {
      location.reload();
    }
  } catch (err) { toast(err.message); }
}

function initGoogle(clientId) {
  let tries = 0;
  (function tick() {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.initialize({ client_id: clientId, callback: onCredential });
      window.google.accounts.id.renderButton($("#gsi-button"), {
        theme: "filled_black", size: "large", shape: "rectangular", text: "signin_with", width: 280,
        locale: LANG === "en" ? "en" : "ko"
      });
      return;
    }
    if (tries++ < 60) setTimeout(tick, 100);
    else $("#gsi-button").innerHTML = '<span style="color:rgba(240,230,220,.7);font-size:11px">' + esc(t("gate.googleLoadFail")) + '</span>';
  })();
}

/* ---------------- nav ---------------- */
const NAV_KEYS = ["home", "activities", "calendar", "notices", "votes", "ideas", "archive", "office"];
const NAV_IDX = { home: "I", activities: "II", calendar: "III", notices: "IV", votes: "V", ideas: "VI", archive: "VII", office: "VIII" };
function navList() {
  return NAV_KEYS.map(key => ({ key, idx: NAV_IDX[key], label: t("nav." + key + ".label"), title: t("nav." + key + ".title") }));
}
function buildNav() {
  const NAV = navList();
  $("#railnav").innerHTML = NAV.map(n =>
    '<button data-go="' + n.key + '"><span class="lab"><span class="idx">' + n.idx +
    '</span><span>' + esc(n.label) + '</span></span><span class="count" data-count="' + n.key + '"></span></button>'
  ).join("");
  $("#tabbar").innerHTML = NAV.filter(n => n.key !== "office" && n.key !== "archive").map(n =>
    '<button data-go="' + n.key + '"><span class="idx">' + n.idx + '</span><span>' + esc(n.label) + '</span></button>'
  ).join("");
}
function go(key) {
  const NAV = navList();
  if (!NAV.some(n => n.key === key)) key = "home";
  $$(".page").forEach(p => p.classList.toggle("on", p.id === "p-" + key));
  $$("[data-go]").forEach(b => {
    if (b.classList.contains("brand")) return;
    if (b.dataset.go === key) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  $("#page-title").textContent = NAV.find(n => n.key === key).title;
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (key === "office" && isAdmin()) loadMembers();
}
document.addEventListener("click", e => { const b = e.target.closest("[data-go]"); if (b) go(b.dataset.go); });

/* ---------------- loaders ---------------- */
async function loadAll() {
  setChip("saving", t("common.loading"));
  try {
    const [set, no, sc, ac, vo, ma, id] = await Promise.all([
      api("/api/settings"), api("/api/notices"), api("/api/schedules"),
      api("/api/activities"), api("/api/votes"), api("/api/materials"), api("/api/ideas")
    ]);
    api("/api/calendar").then(async c => {
      S.gcal = c;
      await translateBatch(collectGcalStrings());
      renderCalendar(); renderSchedules(); renderHome();
    }).catch(() => { S.gcal = { configured: false, events: [] }; });
    S.settings = set.settings;
    S.notices = no.notices; S.schedules = sc.schedules;
    S.activities = ac.activities; S.polls = vo.polls; S.materials = ma.materials;
    S.ideas = id.ideas;
    await translateBatch(collectDynamicStrings());
    renderAll();
    setChip("saved", t("common.connected"));
  } catch (err) {
    setChip("error", t("common.loadFailed"));
    toast(err.message);
  }
}
async function reload(kind) {
  try {
    if (kind === "notices") S.notices = (await api("/api/notices")).notices;
    if (kind === "schedules") S.schedules = (await api("/api/schedules")).schedules;
    if (kind === "activities") S.activities = (await api("/api/activities")).activities;
    if (kind === "polls") S.polls = (await api("/api/votes")).polls;
    if (kind === "materials") S.materials = (await api("/api/materials")).materials;
    if (kind === "ideas") S.ideas = (await api("/api/ideas")).ideas;
    await translateBatch(collectDynamicStrings());
    renderAll();
  } catch (err) { toast(err.message); }
}
async function loadMembers() {
  const box = $("#members-list");
  box.innerHTML = '<p class="loading">' + esc(t("common.loading")) + "</p>";
  try {
    S.members = (await api("/api/members")).members;
    renderMembers();
  } catch (err) { box.innerHTML = '<p class="loading">' + esc(err.message) + "</p>"; }
}

/* ---------------- render ---------------- */
function renderAll() {
  renderChrome(); renderHome(); renderActivities(); renderCalendar();
  renderSchedules(); renderNotices(); renderPolls(); renderMaterials();
  renderIdeas(); renderDrive(); renderOffice(); renderCounts();
}
function renderChrome() {
  const n = new Date();
  $("#today").textContent = LANG === "en"
    ? n.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : n.getFullYear() + "년 " + (n.getMonth() + 1) + "월 " + n.getDate() + "일 " + WD_KO[n.getDay()] + "요일";
  const term = (S.settings && S.settings.term) || {};
  const pct = Math.max(0, Math.min(100, Number(term.progress) || 0));
  $("#term-name").textContent = tx(term.name) || t("office.term");
  $("#term-pct").textContent = pct + "%";
  $("#term-bar").style.width = pct + "%";
  $("#term-note").textContent = tx(term.note) || "";
  const g = (S.settings && S.settings.goal) || {};
  $("#goal-label").textContent = tx(g.label) || t("home.goalLabel");
  $("#goal-lead").textContent = tx(g.lead) || "";
  $("#goal-accent").textContent = tx(g.accent) || "";
  $("#goal-note").textContent = tx(g.note) || "";
  $("#goal-count").textContent = g.count || "—";
  $("#who-name").textContent = S.me.name || S.me.email;
  $("#who-role").textContent = t(ROLE_LABEL[S.me.role] || "role.member");
  $("#who-av").textContent = (S.me.name || S.me.email || "?").slice(0, 1);
  $$(".admin-only").forEach(el => { el.hidden = !isAdmin(); });
}
function renderCounts() {
  const map = {
    activities: S.activities.length,
    calendar: allEvents().filter(s => !ended(s.start_at)).length,
    notices: S.notices.length,
    votes: S.polls.filter(p => !ended(p.deadline)).length,
    ideas: S.ideas.length,
    archive: S.materials.length
  };
  $$("[data-count]").forEach(el => {
    const v = map[el.dataset.count];
    if (!v) { el.textContent = ""; el.style.display = "none"; }
    else { el.textContent = v; el.style.display = ""; }
  });
}

function gcalAddLink(ev) {
  const s = toDate(ev.start_at);
  if (!s) return null;
  const e = new Date(s.getTime() + 3600000);
  const stamp = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const p = new URLSearchParams();
  p.set("action", "TEMPLATE");
  p.set("text", ev.title || "");
  p.set("dates", stamp(s) + "/" + stamp(e));
  if (ev.body) p.set("details", ev.body);
  if (ev.location) p.set("location", ev.location);
  if (S.gcal && S.gcal.calendarId) p.set("src", S.gcal.calendarId);
  return "https://calendar.google.com/calendar/render?" + p.toString();
}

function allEvents() {
  const app = S.schedules.map(x => ({
    id: x.id, title: x.title, body: x.body, location: x.location,
    start_at: x.start_at, author_name: x.author_name, author_id: x.author_id,
    all_day: false, source: "app"
  }));
  const g = (S.gcal.events || []).map(e => ({
    id: e.uid, title: e.title, body: e.body, location: e.location,
    start_at: e.start_at, author_name: "구글 캘린더", all_day: e.all_day, source: "google"
  }));
  return app.concat(g).sort(function (a, b) { return String(a.start_at).localeCompare(String(b.start_at)); });
}

function renderHome() {
  const up = allEvents().filter(s => !ended(s.start_at)).slice(0, 4);
  $("#home-schedules").innerHTML = up.length ? up.map(s => {
    const d = toDate(s.start_at);
    return '<article class="ev"><span class="date"><b>' + d.getDate() + "</b><span>" + pad(d.getMonth() + 1) + (LANG === "en" ? "" : "월") + "</span></span>" +
      '<div><span class="kick">' + esc(tx(s.location) || (s.source === "google" ? t("calendar.googleBadge") : t("common.location"))) + "</span>" +
      "<h4>" + esc(tx(s.title)) + "</h4>" +
      "<p>" + fmtDay(s.start_at) + (s.all_day ? t("home.allDay") : " · " + fmtTime(s.start_at)) + "</p></div></article>";
  }).join("") : '<p style="color:var(--muted);font-size:11px">' + esc(t("home.noUpcoming")) + "</p>";

  const acts = S.activities.slice(0, 3);
  $("#home-activities").innerHTML = acts.length ? acts.map(a =>
    '<article class="act"><div><h4>' + esc(trim(tx(a.content), 36)) + "</h4>" +
    "<p>" + esc(tx(a.category) || t("cat.기타")) + " · " + fmtFull(a.activity_date) + "</p></div>" +
    '<span class="num">' + Number(a.headcount || 0) + "</span></article>"
  ).join("") : '<p style="color:var(--muted);font-size:11px">' + esc(t("home.noActivities")) + "</p>";

  const ns = S.notices.slice(0, 3);
  $("#home-notices").innerHTML = ns.length ? ns.map(n =>
    '<button class="nrow" data-go="notices"><div><h4>' +
    (n.signup ? '<span class="tag brass" style="margin-right:6px">' + esc(t("notices.signupBadge")) + '</span>' : "") +
    esc(tx(n.title)) + "</h4><p>" +
    (n.signup ? n.joined_count + t("home.applied") + (n.capacity ? t("home.capacitySlash") + n.capacity : "") + " · " : "") +
    esc(tx(n.body)) + "</p></div>" +
    "<time>" + ago(n.created_at) + "</time></button>"
  ).join("") : '<p style="color:var(--muted);font-size:11px">' + esc(t("home.noNotices")) + "</p>";

  const ps = S.polls.filter(p => !ended(p.deadline)).slice(0, 3);
  $("#home-polls").innerHTML = ps.length ? ps.map(p =>
    '<button class="nrow" data-go="votes"><div><h4>' + esc(tx(p.title)) + "</h4>" +
    "<p>" + p.total + t("home.attendees") + " · " + left(p.deadline) + "</p></div>" +
    "<time>" + fmtShort(p.deadline) + t("home.deadline") + "</time></button>"
  ).join("") : '<p style="color:var(--muted);font-size:11px">' + esc(t("home.noPolls")) + "</p>";
}

const canEdit = row => isAdmin() || row.author_id === S.me.id;
const canDelete = canEdit;
const rowBtns = (kind, row) => canEdit(row)
  ? '<span class="rowbtns">' +
    '<button class="btn ghost sm" data-edit="' + kind + '" data-id="' + row.id + '">' + esc(t("common.edit")) + '</button>' +
    '<button class="btn ghost sm" data-del="' + kind + '" data-id="' + row.id + '">' + esc(t("common.delete")) + '</button></span>'
  : "";
const delBtn = rowBtns;

function renderActivities() {
  $("#act-count").textContent = S.activities.length + t("activities.count");
  $("#activity-list").innerHTML = S.activities.length ? S.activities.map(a =>
    '<article class="tile">' +
    '<div class="tile-top"><span class="tag brass">' + esc(tx(a.category) || t("cat.기타")) + "</span><span>" + esc(a.author_name) + "</span></div>" +
    "<h3>" + esc(tx(a.content)) + "</h3>" +
    '<div class="facts"><span><small>' + esc(t("activities.dateLabel")) + '</small><b>' + fmtFull(a.activity_date) + "</b></span>" +
    "<span><small>" + esc(t("activities.attendLabel")) + "</small><b>" + Number(a.headcount || 0) + "</b></span></div>" +
    '<div style="display:flex;justify-content:flex-end">' + rowBtns("activities", a) + "</div></article>"
  ).join("") : '<div class="empty" style="grid-column:1/-1"><b>' + esc(t("activities.empty.title")) + "</b>" + esc(t("activities.empty.body")) + "</div>";
}

function renderCalendar() {
  const g = S.gcal || {};

  const name = $("#gcal-name");
  if (name && g.name) name.textContent = g.name;

  const state = $("#gcal-state");
  if (state) {
    state.textContent = g.error ? g.error : (g.configured ? t("calendar.liveSync") : t("calendar.notSynced"));
    state.className = "tag " + (g.error ? "pin" : (g.configured ? "vote" : "quiet"));
  }

  const frame = $("#gcal-embed");
  if (frame && g.embed && frame.getAttribute("src") !== g.embed) frame.setAttribute("src", g.embed);

  const open = $("#gcal-open");
  if (open && g.link) open.href = g.link;
}

(function () {
  const btn = document.getElementById("gcal-refresh");
  if (btn) btn.addEventListener("click", async function () {
    const f = $("#gcal-embed");
    if (f && f.src) { const u = f.src; f.src = "about:blank"; setTimeout(function () { f.src = u; }, 60); }
    try {
      S.gcal = await api("/api/calendar");
      await translateBatch(collectGcalStrings());
    } catch (e) { /* noop */ }
    renderCalendar(); renderSchedules(); renderHome();
    toast(t("calendar.reloaded"));
  });
})();

function renderSchedules() {
  const merged = allEvents().filter(function (e) { return e.source === "app"; });
  $("#sch-count").textContent = merged.length;
  $("#schedule-list").innerHTML = merged.length ? merged.map(s => {
    const d = toDate(s.start_at);
    return '<article class="ev" style="grid-template-columns:42px 1fr auto;' + (ended(s.start_at) ? "opacity:.45" : "") + '">' +
      '<span class="date"><b>' + (d ? d.getDate() : "–") + "</b><span>" + (d ? pad(d.getMonth() + 1) + (LANG === "en" ? "" : "월") : "") + "</span></span>" +
      '<div><span class="kick">' + esc(tx(s.location) || t("common.location")) + " · " + esc(s.author_name) +
      (s.source === "google" ? ' <span class="tag brass">' + esc(t("calendar.googleBadge")) + '</span>' : "") + "</span>" +
      "<h4>" + esc(tx(s.title)) + "</h4>" +
      "<p>" + fmtFull(s.start_at) + " " + (d ? WD()[d.getDay()] : "") + (s.all_day ? t("home.allDay") : " · " + fmtTime(s.start_at)) + "</p>" +
      (s.body ? '<p style="color:var(--ink-2);margin-top:5px">' + esc(trim(tx(s.body), 300)) + "</p>" : "") +
      "</div>" + (s.source === "app" ? '<span class="rowbtns col">' +
        (S.gcal && S.gcal.configured
          ? '<a class="btn ghost sm" href="' + esc(gcalAddLink(s) || "#") + '" target="_blank" rel="noopener noreferrer">' + esc(t("calendar.addToGoogle")) + '</a>'
          : "") +
        (canEdit(s) ? '<button class="btn ghost sm" data-edit="schedules" data-id="' + s.id + '">' + esc(t("common.edit")) + '</button>' +
        '<button class="btn ghost sm" data-del="schedules" data-id="' + s.id + '">' + esc(t("common.delete")) + '</button>' : "") +
        "</span>" : "<span></span>") +
      "</article>";
  }).join("") : '<p style="color:var(--muted);font-size:11px">' + esc(t("calendar.empty")) + "</p>";
}
function renderNotices() {
  $("#notice-list").innerHTML = S.notices.length ? S.notices.map(function (n) {
    const badge = n.signup ? '<span class="tag brass">' + esc(t("notices.signupBadge")) + '</span>'
                : '<span class="tag ' + (n.pinned ? "pin" : "new") + '">' + (n.pinned ? esc(t("notices.pinned")) : esc(t("notices.plain"))) + "</span>";

    let when = "";
    if (n.start_at) {
      const past = ended(n.start_at);
      when = '<div class="when' + (past ? " past" : "") + '">' +
        "<b>" + fmtFull(n.start_at) + " " + WD()[toDate(n.start_at).getDay()] + " " + fmtTime(n.start_at) + "</b>" +
        (n.location ? "<span>" + esc(tx(n.location)) + "</span>" : "") +
        (past ? "<span>" + esc(t("notices.pastEvent")) + "</span>" : "<span>" + left(n.start_at) + "</span>") +
        "</div>";
    }

    let signup = "";
    if (n.signup) {
      const full = n.capacity > 0 && n.joined_count >= n.capacity && !n.joined;
      const closed = n.start_at && ended(n.start_at);
      const names = (n.participants || []);
      signup = '<div class="signup">' +
        '<div class="signup-top">' +
        '<button class="join' + (n.joined ? " on" : "") + '" data-join="' + n.id + '"' +
          (full || closed ? " disabled" : "") + ">" +
          (n.joined ? t("notices.joinCancel") : (closed ? t("notices.joinClosed") : (full ? t("notices.joinFull") : t("notices.join")))) + "</button>" +
        '<b class="tnum">' + n.joined_count + (n.capacity ? " / " + n.capacity : "") + t("notices.people") + "</b>" +
        (n.capacity ? '<div class="cap"><i style="width:' +
          Math.min(100, Math.round(n.joined_count / n.capacity * 100)) + '%"></i></div>' : "") +
        "</div>" +
        '<div class="who-list">' +
          (names.length ? names.map(function (x) { return '<span class="chip">' + esc(x) + "</span>"; }).join("")
                        : '<span class="none">' + esc(t("notices.noParticipants")) + '</span>') +
        "</div></div>";
    }

    return '<article class="item notice' + (n.signup ? " has-signup" : "") + '">' + badge +
      "<div><h3>" + esc(tx(n.title)) + "</h3>" + when +
      "<p>" + esc(tx(n.body)) + "</p>" + signup +
      '<div class="meta">' + esc(n.author_name) + " · " + fmtFull(n.created_at) + "</div></div>" +
      '<div class="side"><time>' + ago(n.created_at) + "</time>" + rowBtns("notices", n) + "</div></article>";
  }).join("") : '<div class="empty"><b>' + esc(t("notices.empty.title")) + "</b>" + esc(t("notices.empty.body")) + "</div>";
}

const openTalks = {};
const commentCache = {};
function renderPolls() {
  $("#poll-count").textContent = S.polls.filter(p => !ended(p.deadline)).length + (LANG === "en" ? " open" : "개 진행 중");
  if (!S.polls.length) {
    $("#poll-list").innerHTML = '<div class="empty"><b>' + esc(t("votes.empty.title")) + "</b>" + esc(t("votes.empty.body")) + "</div>";
    return;
  }
  $("#poll-list").innerHTML = S.polls.map(p => {
    const done = ended(p.deadline);
    const total = p.total || 0;
    const myOpts = p.options.filter(o => o.selected);

    const tally = '<div class="tally">' + p.options.map(o => {
      const pct = total ? Math.round(o.vote_count / total * 100) : 0;
      return '<div><div class="line"><b>' + esc(tx(o.label)) + "</b><span>" + o.vote_count + " · " + pct + "%</span></div>" +
        '<div class="meter"><i style="width:' + pct + '%"></i></div></div>';
    }).join("") + "</div>";

    const choices = '<div class="choices">' + p.options.map((o, i) =>
      '<button class="choice" aria-pressed="' + !!o.selected + '" data-vote="' + p.id + '" data-opt="' + o.id + '"' + (done ? " disabled" : "") + ">" +
      '<span class="n">' + pad(i + 1) + "</span><span><b>" + esc(tx(o.label)) + "</b>" +
      "<small>" + (o.selected ? t("votes.selectedNote") : (done ? t("votes.endedNote") : (p.multi ? t("votes.addToSelection") : t("votes.voteThis")))) + "</small></span></button>"
    ).join("") + "</div>";

    const cached = commentCache[p.id];
    const msgs = cached === undefined
      ? '<p class="loading">' + esc(t("common.loading")) + "</p>"
      : (cached.length ? cached.map(c =>
          '<article class="msg"><span class="av">' + esc((c.author_name || "참").slice(0, 1)) + "</span>" +
          '<div><div class="msg-meta"><b>' + esc(c.author_name) + "</b>" +
          '<span class="tag ' + (c.option_label ? "vote" : "quiet") + '">' + esc(tx(c.option_label) || t("votes.neutral")) + "</span>" +
          "<time>" + ago(c.created_at) + "</time></div><p>" + esc(tx(c.body)) + "</p></div></article>"
        ).join("")
        : '<p style="color:var(--muted);font-size:10.5px;padding:10px 0;text-align:center">' + esc(t("votes.firstComment")) + "</p>");

    const form = done ? "" :
      '<form class="reply" data-reply="' + p.id + '"><div class="picks">' +
      p.options.map((o, i) => '<label><input type="radio" name="op-' + p.id + '" value="' + o.id + '"' + (i === 0 ? " checked" : "") + "><span>" + esc(tx(o.label)) + "</span></label>").join("") +
      '<label><input type="radio" name="op-' + p.id + '" value=""><span>' + esc(t("votes.neutral")) + '</span></label></div>' +
      '<div class="row"><textarea maxlength="500" required placeholder="' + esc(t("votes.commentPh")) + '"></textarea>' +
      '<button class="btn primary" type="submit">' + esc(t("votes.post")) + '</button></div></form>';

    return '<article class="panel">' +
      '<div class="poll-top"><div class="left"><span class="tag ' + (done ? "quiet" : "vote") + '">' + (done ? esc(t("votes.ended")) : esc(t("votes.inProgress"))) + "</span>" +
      (p.multi ? '<span class="tag brass">' + esc(t("votes.multiBadge")) + '</span>' : "") +
      '<span style="color:var(--muted);font-size:10px">' + left(p.deadline) + " · " + fmtFull(p.deadline) + " " + fmtTime(p.deadline) + (LANG === "en" ? " close" : " 마감") + "</span></div>" +
      rowBtns("votes", p) + "</div>" +
      "<h3>" + esc(tx(p.title)) + '</h3><p class="body">' + esc(tx(p.content)) + "</p>" +
      '<div class="headline"><span>' + esc(t("votes.currentJoined")) + '<b>' + total + "</b>" + esc(t("votes.peopleJoined")) +
      (p.multi ? esc(t("votes.totalVotes")) + '<b>' + p.picks + "</b>" + esc(t("votes.votesSuffix")) : "") + "</span>" +
      "<span>" + (myOpts.length ? esc(t("votes.myChoice")) + "<b>" + myOpts.map(o => esc(tx(o.label))).join(", ") + "</b>" : esc(t("votes.notChosenYet"))) + "</span></div>" +
      tally + choices +
      '<div class="talk"><div class="talk-head"><div><b>' + esc(t("votes.discuss")) + '</b><span>' + p.comment_count + "</span></div>" +
      '<button class="btn ghost sm" data-talk="' + p.id + '">' + esc(openTalks[p.id] ? t("votes.hideComments") : t("votes.showComments")) + "</button></div>" +
      '<div class="msgs" ' + (openTalks[p.id] ? "" : "hidden") + ">" + msgs + "</div>" +
      (openTalks[p.id] ? form : "") + "</div>" +
      "<footer>" + esc(t("votes.openedBy")) + esc(p.author_name) + " · " + fmtFull(p.created_at) + "</footer></article>";
  }).join("");
}

(function () {
  const btn = document.getElementById("roadmap-edit-btn");
  if (btn) btn.addEventListener("click", openRoadmapEditor);
})();

function openRoadmapEditor() {
  const current = ((S.settings || {}).roadmap || []).map(s => ({
    title: s.title || "", when: s.when || "", state: s.state || "next"
  }));
  const STATE_LABEL = () => ({
    done: t("office.stateDone"), now: t("office.stateNow"), next: t("office.stateNext")
  });

  const root = $("#modal-root");
  root.innerHTML =
    '<div class="scrim" role="dialog" aria-modal="true" aria-labelledby="rm-title"><form class="sheet" id="rm-sheet">' +
    '<button type="button" class="x" id="rm-close" aria-label="' + esc(t("form.close")) + '">×</button>' +
    '<p class="eyebrow">Settings</p><h2 id="rm-title">' + esc(t("office.roadmapEdit")) + '</h2>' +
    '<p>' + esc(t("form.editHint")) + '</p>' +
    '<div id="rm-rows" style="display:grid;gap:10px;margin-top:20px"></div>' +
    '<button type="button" class="addopt" id="rm-add">' + esc(t("office.roadmapAdd")) + '</button>' +
    '<button class="btn primary" type="submit" style="width:100%;margin-top:20px;padding:11px">' + esc(t("common.save")) + '</button>' +
    '</form></div>';

  const scrim = $(".scrim", root), sheet = $("#rm-sheet", root), rows = $("#rm-rows", root);
  const close = () => { root.innerHTML = ""; document.removeEventListener("keydown", onKey); };
  function onKey(ev) { if (ev.key === "Escape") close(); }
  document.addEventListener("keydown", onKey);
  $("#rm-close", root).addEventListener("click", close);
  scrim.addEventListener("mousedown", ev => { if (ev.target === scrim) close(); });

  const addRow = (data) => {
    const d = data || { title: "", when: "", state: "next" };
    const row = document.createElement("div");
    row.className = "rm-row";
    row.style.cssText = "display:grid;grid-template-columns:1fr 110px 100px 30px;gap:7px;align-items:center";
    const stLabels = STATE_LABEL();
    row.innerHTML =
      '<input class="rm-title" placeholder="' + esc(t("office.roadmap")) + '" maxlength="60">' +
      '<input class="rm-when" placeholder="4–5월" maxlength="30">' +
      '<select class="rm-state">' +
        '<option value="done">' + esc(stLabels.done) + '</option>' +
        '<option value="now">' + esc(stLabels.now) + '</option>' +
        '<option value="next">' + esc(stLabels.next) + '</option>' +
      '</select>' +
      '<button type="button" class="rm-del" aria-label="' + esc(t("office.roadmapRemove")) + '" style="border:0;background:none;color:var(--muted);font-size:16px">×</button>';
    row.querySelector(".rm-title").value = d.title;
    row.querySelector(".rm-when").value = d.when;
    row.querySelector(".rm-state").value = d.state;
    row.querySelector(".rm-del").addEventListener("click", () => row.remove());
    rows.appendChild(row);
  };
  current.forEach(addRow);
  if (!current.length) addRow();

  $("#rm-add", root).addEventListener("click", () => addRow());

  sheet.addEventListener("submit", async ev => {
    ev.preventDefault();
    const list = $$(".rm-row", rows).map(r => ({
      title: r.querySelector(".rm-title").value.trim(),
      when: r.querySelector(".rm-when").value.trim(),
      state: r.querySelector(".rm-state").value
    })).filter(x => x.title);
    if (!list.length) return toast(t("office.roadmapNoTitle"));
    const btn = sheet.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const data = await api("/api/settings", { method: "PUT", body: JSON.stringify({ settings: { roadmap: list } }) });
      S.settings = data.settings;
      renderOffice();
      close();
      toast(t("office.roadmapSaved"));
    } catch (err) { toast(err.message); btn.disabled = false; }
  });
}

let docQuery = "";
(function () {
  const btn = document.getElementById("drive-refresh");
  if (btn) btn.addEventListener("click", () => {
    const f = $("#drive-embed");
    if (f && f.src) { const u = f.src; f.src = "about:blank"; setTimeout(() => { f.src = u; }, 60); }
    toast(t("archive.reloaded"));
  });
})();

$("#doc-search").addEventListener("input", e => { docQuery = e.target.value.trim().toLowerCase(); renderMaterials(); });
function extOf(m) {
  const u = String(m.url || "");
  if (/docs\.google\.com\/document/.test(u)) return "DOC";
  if (/docs\.google\.com\/spreadsheets/.test(u)) return "SHEET";
  if (/docs\.google\.com\/presentation/.test(u)) return "SLIDE";
  if (/\.pdf($|\?)/i.test(u)) return "PDF";
  if (/drive\.google\.com/.test(u)) return "DRIVE";
  return "LINK";
}
function renderMaterials() {
  let list = S.materials;
  if (docQuery) {
    list = list.filter(m => String(m.name || "").toLowerCase().indexOf(docQuery) >= 0 ||
      (m.tags || []).some(t2 => String(t2).toLowerCase().indexOf(docQuery) >= 0) ||
      String(tx(m.name) || "").toLowerCase().indexOf(docQuery) >= 0);
  }
  $("#material-list").innerHTML = list.length ? list.map(m =>
    '<article class="doc"><div style="min-width:0"><span class="ext">' + extOf(m) + "</span>" +
    '<h3><a href="' + esc(m.url) + '" target="_blank" rel="noopener noreferrer">' + esc(tx(m.name)) + "</a></h3>" +
    '<div class="meta">' + esc(m.author_name) + " · " + fmtFull(m.created_at) + "</div>" +
    ((m.tags || []).length ? '<div class="tagrow">' + m.tags.map(t2 => '<span class="tag quiet">' + esc(tx(t2)) + "</span>").join("") + "</div>" : "") +
    "</div>" + rowBtns("materials", m) + "</article>"
  ).join("") : '<div class="empty" style="grid-column:1/-1"><b>' + (docQuery ? esc(t("archive.noResults")) : esc(t("archive.empty"))) + "</b>" +
    (docQuery ? esc(t("archive.noResultsBody")) : esc(t("archive.emptyBody"))) + "</div>";
}

const IDEA_STATUS_KEYS = { open: "ideaStatus.open", reviewing: "ideaStatus.reviewing", done: "ideaStatus.done", closed: "ideaStatus.closed" };
const IDEA_TAG = { open: "new", reviewing: "brass", done: "pin", closed: "quiet" };
const openIdeas = {};
const replyCache = {};

function renderIdeas() {
  $("#idea-count").textContent = S.ideas.length + t("ideas.count");
  if (!S.ideas.length) {
    $("#idea-list").innerHTML = '<div class="empty"><b>' + esc(t("ideas.empty.title")) + "</b>" + esc(t("ideas.empty.body")) + "</div>";
    return;
  }
  $("#idea-list").innerHTML = S.ideas.map(i => {
    const cached = replyCache[i.id];
    const replies = cached === undefined
      ? '<p class="loading">' + esc(t("common.loading")) + "</p>"
      : (cached.length ? cached.map(r =>
          '<article class="msg"><span class="av">' + esc((r.author_name || "학").slice(0, 1)) + "</span>" +
          '<div><div class="msg-meta"><b>' + esc(r.author_name) + "</b>" +
          "<time>" + ago(r.created_at) + "</time></div><p>" + esc(tx(r.body)) + "</p></div></article>"
        ).join("")
        : '<p style="color:var(--muted);font-size:10.5px;padding:10px 0;text-align:center">' + esc(t("ideas.noReplies")) + "</p>");

    const statusPicker = isAdmin()
      ? '<select class="idea-status" data-status="' + i.id + '">' +
        Object.keys(IDEA_STATUS_KEYS).map(k =>
          '<option value="' + k + '"' + (i.status === k ? " selected" : "") + ">" + esc(t(IDEA_STATUS_KEYS[k])) + "</option>").join("") +
        "</select>"
      : '<span class="tag ' + (IDEA_TAG[i.status] || "quiet") + '">' + esc(t(IDEA_STATUS_KEYS[i.status] || "ideaStatus.open")) + "</span>";

    return '<article class="panel idea">' +
      '<div class="idea-top">' + statusPicker + rowBtns("ideas", i) + "</div>" +
      "<h3>" + esc(tx(i.title)) + '</h3><p class="body">' + esc(tx(i.body)) + "</p>" +
      '<div class="idea-foot">' +
      '<button class="like' + (i.liked ? " on" : "") + '" data-like="' + i.id + '">' +
      '<span class="heart">' + (i.liked ? "♥" : "♡") + '</span><b>' + i.like_count + "</b> " + esc(t("ideas.like")) + "</button>" +
      '<button class="btn ghost sm" data-openidea="' + i.id + '">' + esc(t("ideas.showReplies")) + i.reply_count + esc(openIdeas[i.id] ? t("ideas.repliesShown") : t("ideas.repliesHidden")) + "</button>" +
      '<span class="idea-by">' + esc(i.author_name) + " · " + ago(i.created_at) + "</span></div>" +
      '<div class="idea-replies" ' + (openIdeas[i.id] ? "" : "hidden") + ">" +
      '<div class="msgs">' + replies + "</div>" +
      '<form class="reply" data-idearep="' + i.id + '"><div class="row">' +
      '<textarea maxlength="500" required placeholder="' + esc(t("ideas.replyPh")) + '"></textarea>' +
      '<button class="btn primary" type="submit">' + esc(t("votes.post")) + '</button></div></form>' +
      "</div></article>";
  }).join("");
}

function renderDrive() {
  const d = (S.settings || {}).drive || {};
  const frame = $("#drive-embed"), open = $("#drive-open");
  if (!frame) return;
  if (!d.folderId) {
    $("#drive-hint").textContent = t("archive.noFolder");
    return;
  }
  const src = "https://drive.google.com/embeddedfolderview?id=" + encodeURIComponent(d.folderId) + "#list";
  if (frame.getAttribute("src") !== src) frame.setAttribute("src", src);
  if (open) open.href = d.url || ("https://drive.google.com/drive/folders/" + d.folderId);
}

function renderOffice() {
  const st = S.settings || {};
  const term = st.term || {};
  $("#road-term").textContent = tx(term.name) || t("office.term");
  const now = (st.roadmap || []).find(s => s.state === "now");
  $("#road-now").textContent = now ? tx(now.title) : t("office.planning");
  $("#roadmap").innerHTML = (st.roadmap || []).map(s =>
    '<div class="step ' + esc(s.state || "next") + '"><span class="dot"></span>' +
    "<span><b>" + esc(tx(s.title)) + "</b><small>" + esc(tx(s.when) || "") + " · " +
    (s.state === "done" ? esc(t("office.stateDone")) : s.state === "now" ? esc(t("office.stateNow")) : esc(t("office.stateNext"))) + "</small></span></div>"
  ).join("");
  $("#topics").innerHTML = (st.topics || []).map(t2 =>
    '<div class="topic"><b><i>' + esc(t2.no) + "</i>" + esc(tx(t2.title)) + "</b><p>" + esc(tx(t2.detail)) + "</p></div>"
  ).join("");
  const r = st.recruit || {};
  $("#recruit").innerHTML =
    '<div class="kv"><dt>Period</dt><dd>' + esc(tx(r.period) || t("office.unset")) + "</dd></div>" +
    '<div class="kv"><dt>Eligibility</dt><dd>' + esc(tx(r.eligibility) || "—") + "</dd></div>" +
    '<div class="kv"><dt>Process</dt><dd>' + esc(tx(r.process) || "—") + "</dd></div>" +
    '<div class="kv"><dt>Contact</dt><dd>' + esc(tx(r.contact) || "—") + "</dd></div>";
  $("#set-term").textContent = (tx(term.name) || t("office.term")) + " · " + (Number(term.progress) || 0) + "%";
  const g = st.goal || {};
  $("#set-goal").textContent = ((tx(g.lead) || "") + " " + (tx(g.accent) || "")).trim() || t("office.notSet");
}
function renderMembers() {
  const STATUS_KEYS = { pending: "memberStatus.pending", approved: "memberStatus.approved", rejected: "memberStatus.rejected" };
  const pending = S.members.filter(m => m.status === "pending").length;
  const badge = $("#pending-count");
  badge.hidden = !pending; badge.textContent = pending + t("office.waiting");
  $("#members-list").innerHTML = S.members.length ? S.members.map(m => {
    const roleBadge = m.role === "admin"
      ? '<span class="tag vote">' + esc(t(m.bootstrap ? "office.founder" : "office.officer")) + '</span>'
      : "";
    let roleBtn = "";
    if (m.status === "approved" && !m.bootstrap) {
      roleBtn = m.is_officer
        ? '<button class="btn sm ghost" data-role="member">' + esc(t("office.revokeOfficer")) + '</button>'
        : '<button class="btn sm" data-role="admin">' + esc(t("office.makeOfficer")) + '</button>';
    }
    return '<div class="member" data-email="' + esc(m.email) + '">' +
      "<div><b>" + esc(m.name || m.email) + "</b> " + roleBadge +
      "<small>" + esc(m.email) + " · " + esc(t(STATUS_KEYS[m.status])) + "</small></div>" +
      '<div class="member-actions">' +
      (m.status !== "approved" ? '<button class="btn sm" data-decide="approved">' + esc(t("office.approve")) + '</button>' : "") +
      (m.status !== "rejected" ? '<button class="btn sm" data-decide="rejected">' + esc(t("office.reject")) + '</button>' : "") +
      roleBtn +
      "</div></div>";
  }).join("") : '<p class="loading">' + esc(t("office.noApplicants")) + "</p>";
}

/* ---------------- interactions ---------------- */
document.addEventListener("click", async e => {
  const vote = e.target.closest("[data-vote]");
  if (vote) {
    vote.disabled = true;
    try {
      const data = await api("/api/votes/" + vote.dataset.vote + "/cast", {
        method: "POST", body: JSON.stringify({ option_id: Number(vote.dataset.opt) })
      });
      const i = S.polls.findIndex(p => p.id === data.poll.id);
      if (i >= 0) S.polls[i] = data.poll;
      renderPolls(); renderHome();
      toast(t("votes.reflected"));
    } catch (err) { toast(err.message); vote.disabled = false; }
    return;
  }

  const talk = e.target.closest("[data-talk]");
  if (talk) {
    const id = Number(talk.dataset.talk);
    openTalks[id] = !openTalks[id];
    renderPolls();
    if (openTalks[id] && commentCache[id] === undefined) {
      try {
        commentCache[id] = (await api("/api/votes/" + id + "/comments")).comments;
        await translateBatch(commentCache[id].flatMap(c => [c.body, c.option_label]));
      } catch (err) { commentCache[id] = []; toast(err.message); }
      renderPolls();
    }
    return;
  }

  const join = e.target.closest("[data-join]");
  if (join) {
    const id = Number(join.dataset.join);
    join.disabled = true;
    try {
      const d = await api("/api/notices/" + id + "/join", { method: "POST" });
      const it = S.notices.find(function (x) { return x.id === id; });
      if (it) {
        it.joined = d.joined;
        it.joined_count = d.joined_count;
        it.participants = d.participants;
      }
      renderNotices();
      toast(d.joined ? t("notices.joined") : t("notices.left"));
    } catch (err) { toast(err.message); join.disabled = false; }
    return;
  }

  const like = e.target.closest("[data-like]");
  if (like) {
    const id = Number(like.dataset.like);
    like.disabled = true;
    try {
      const d = await api("/api/ideas/" + id + "/like", { method: "POST" });
      const it = S.ideas.find(x => x.id === id);
      if (it) { it.like_count = d.like_count; it.liked = d.liked; }
      renderIdeas();
    } catch (err) { toast(err.message); like.disabled = false; }
    return;
  }

  const oi = e.target.closest("[data-openidea]");
  if (oi) {
    const id = Number(oi.dataset.openidea);
    openIdeas[id] = !openIdeas[id];
    renderIdeas();
    if (openIdeas[id] && replyCache[id] === undefined) {
      try {
        replyCache[id] = (await api("/api/ideas/" + id + "/replies")).replies;
        await translateBatch(replyCache[id].map(r => r.body));
      } catch (err) { replyCache[id] = []; toast(err.message); }
      renderIdeas();
    }
    return;
  }

  const decide = e.target.closest("[data-decide]");
  if (decide) {
    const email = decide.closest(".member").dataset.email;
    decide.disabled = true;
    try {
      await api("/api/members/" + encodeURIComponent(email) + "/decision", {
        method: "POST", body: JSON.stringify({ status: decide.dataset.decide })
      });
      toast(decide.dataset.decide === "approved" ? t("office.approved") : t("office.rejected"));
      loadMembers();
    } catch (err) { toast(err.message); decide.disabled = false; }
    return;
  }

  const roleBtn = e.target.closest("[data-role]");
  if (roleBtn) {
    const email = roleBtn.closest(".member").dataset.email;
    const targetRole = roleBtn.dataset.role;
    if (targetRole === "member") {
      const ok = await askConfirm({
        title: t("office.revokeOfficer"),
        message: t("office.revokeConfirm"),
        confirmLabel: t("office.revokeOfficer")
      });
      if (!ok) return;
    }
    roleBtn.disabled = true;
    try {
      await api("/api/members/" + encodeURIComponent(email) + "/role", {
        method: "POST", body: JSON.stringify({ role: targetRole })
      });
      toast(targetRole === "admin" ? t("office.officerAssigned") : t("office.officerRevoked"));
      loadMembers();
    } catch (err) { toast(err.message); roleBtn.disabled = false; }
    return;
  }

  const del = e.target.closest("[data-del]");
  if (del) {
    const kind = del.dataset.del;
    const LABEL_KEY = { notices: "label.notices", schedules: "label.schedules", activities: "label.activities",
                    votes: "label.votes", materials: "label.materials", ideas: "label.ideas" };
    const label = t(LABEL_KEY[kind]) || kind;
    const msg = LANG === "en"
      ? "Delete this " + label + "? " + t("confirm.deleteMsg")
      : "이 " + label + objParticle(label) + " " + t("confirm.deleteMsg");
    const ok = await askConfirm({
      title: LANG === "en" ? (t("confirm.deleteTitle") + " " + label) : (label + " " + t("confirm.deleteTitle")),
      message: msg,
      confirmLabel: t("confirm.deleteBtn")
    });
    if (!ok) return;
    del.disabled = true;
    try {
      await api("/api/" + kind + "/" + del.dataset.id, { method: "DELETE" });
      await reload(kind === "votes" ? "polls" : kind);
      toast(LANG === "en" ? (label.charAt(0).toUpperCase() + label.slice(1) + " deleted.") : (label + objParticle(label) + " 삭제했습니다."));
    } catch (err) { toast(err.message); del.disabled = false; }
    return;
  }

  const ed = e.target.closest("[data-edit]");
  if (ed) {
    const KIND = { notices: "notice", schedules: "schedule", activities: "activity",
                   materials: "material", votes: "poll", ideas: "idea" };
    const LIST = { notices: S.notices, schedules: S.schedules, activities: S.activities,
                   materials: S.materials, votes: S.polls, ideas: S.ideas };
    const row = LIST[ed.dataset.edit].find(x => String(x.id) === String(ed.dataset.id));
    if (row) openForm(KIND[ed.dataset.edit], row);
    return;
  }

  const nw = e.target.closest("[data-new]");
  if (nw) openForm(nw.dataset.new);
});

document.addEventListener("change", async e => {
  const sel = e.target.closest("[data-status]");
  if (!sel) return;
  const id = Number(sel.dataset.status);
  try {
    await api("/api/ideas/" + id + "/status", { method: "POST", body: JSON.stringify({ status: sel.value }) });
    const it = S.ideas.find(x => x.id === id);
    if (it) it.status = sel.value;
    toast(t("ideas.statusChanged"));
  } catch (err) { toast(err.message); }
});

document.addEventListener("submit", async e => {
  const ir = e.target.closest("[data-idearep]");
  if (ir) {
    e.preventDefault();
    const id = Number(ir.dataset.idearep);
    const ta = ir.querySelector("textarea");
    const text = ta.value.trim();
    if (!text) return;
    const btn = ir.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const d = await api("/api/ideas/" + id + "/replies", { method: "POST", body: JSON.stringify({ body: text }) });
      replyCache[id] = (replyCache[id] || []).concat([d.reply]);
      const it = S.ideas.find(x => x.id === id);
      if (it) it.reply_count++;
      renderIdeas();
      toast(t("ideas.replyPosted"));
    } catch (err) { toast(err.message); btn.disabled = false; }
    return;
  }

  const f = e.target.closest("[data-reply]");
  if (!f) return;
  e.preventDefault();
  const id = Number(f.dataset.reply);
  const ta = f.querySelector("textarea");
  const text = ta.value.trim();
  if (!text) return;
  const picked = f.querySelector("input:checked");
  const btn = f.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const data = await api("/api/votes/" + id + "/comments", {
      method: "POST",
      body: JSON.stringify({ body: text, option_id: picked && picked.value ? Number(picked.value) : null })
    });
    commentCache[id] = (commentCache[id] || []).concat([data.comment]);
    const p = S.polls.find(x => x.id === id);
    if (p) p.comment_count++;
    renderPolls();
    toast(t("ideas.replyPosted"));
  } catch (err) { toast(err.message); btn.disabled = false; }
});

/* ---------------- forms ---------------- */
const EDIT_NOUN_EN = { notice: "Notice", schedule: "Event", activity: "Activity", material: "Resource", idea: "Suggestion", poll: "Poll" };
function editTitleFor(kind, base) {
  return LANG === "en" ? ("Edit " + EDIT_NOUN_EN[kind]) : (base + " " + t("form.editSuffix"));
}
function buildForms() {
  return {
    notice: { kicker: t("notice.kicker"), title: t("notice.title"), editTitle: editTitleFor("notice", t("notice.title")), desc: t("notice.desc"), submit: t("notice.submit"),
      fields: [
        { k: "title", label: t("notice.f.title"), type: "text", max: 100, required: true, ph: t("notice.f.titlePh") },
        { k: "body", label: t("notice.f.body"), type: "textarea", max: 3000, required: true, ph: t("notice.f.bodyPh") },
        { k: "pinned", label: t("notice.f.pinned"), type: "check", note: t("notice.f.pinnedNote") },
        { k: "signup", label: t("notice.f.signup"), type: "check", note: t("notice.f.signupNote") },
        { k: "start_at", label: t("notice.f.startAt"), hint: t("notice.f.startAtHint"), type: "datetime-local" },
        { k: "location", label: t("notice.f.location"), hint: t("notice.f.locationHint"), type: "text", max: 100, ph: t("notice.f.locationPh") },
        { k: "capacity", label: t("notice.f.capacity"), hint: t("notice.f.capacityHint"), type: "number", min: 0, max: 999 }
      ] },
    schedule: { kicker: t("schedule.kicker"), title: t("schedule.title"), editTitle: editTitleFor("schedule", t("schedule.title")), desc: t("schedule.desc"), submit: t("schedule.submit"),
      fields: [
        { k: "title", label: t("schedule.f.title"), type: "text", max: 100, required: true, ph: t("schedule.f.titlePh") },
        { k: "start_at", label: t("schedule.f.startAt"), type: "datetime-local", required: true },
        { k: "location", label: t("schedule.f.location"), hint: t("schedule.f.locationHint"), type: "text", max: 100, ph: t("schedule.f.locationPh") },
        { k: "body", label: t("schedule.f.body"), type: "textarea", max: 2000, required: true, ph: t("schedule.f.bodyPh") }
      ] },
    activity: { kicker: t("activity.kicker"), title: t("activity.title"), editTitle: editTitleFor("activity", t("activity.title")), desc: t("activity.desc"), submit: t("activity.submit"),
      fields: [
        { k: "content", label: t("activity.f.content"), type: "textarea", max: 3000, required: true, ph: t("activity.f.contentPh") },
        { k: "category", label: t("activity.f.category"), type: "select", options: ["경제", "비즈니스", "국가별 주제", "기타"] },
        { k: "activity_date", label: t("activity.f.date"), type: "date", required: true },
        { k: "headcount", label: t("activity.f.headcount"), type: "number", min: 1, max: 999, required: true, ph: t("activity.f.headcountPh") }
      ] },
    material: { kicker: t("material.kicker"), title: t("material.title"), editTitle: editTitleFor("material", t("material.title")), desc: t("material.desc"), submit: t("material.submit"),
      fields: [
        { k: "name", label: t("material.f.name"), type: "text", max: 120, required: true, ph: t("material.f.namePh") },
        { k: "url", label: t("material.f.url"), type: "url", required: true, ph: "https://..." },
        { k: "tags", label: t("material.f.tags"), hint: t("material.f.tagsHint"), type: "text", max: 120, ph: t("material.f.tagsPh") }
      ] },
    idea: { kicker: t("idea.kicker"), title: t("idea.title"), editTitle: editTitleFor("idea", t("idea.title")), desc: t("idea.desc"), submit: t("idea.submit"),
      fields: [
        { k: "title", label: t("idea.f.title"), type: "text", max: 100, required: true, ph: t("idea.f.titlePh") },
        { k: "body", label: t("idea.f.body"), type: "textarea", max: 3000, required: true, ph: t("idea.f.bodyPh") }
      ] },
    poll: { kicker: t("poll.kicker"), title: t("poll.title"), editTitle: editTitleFor("poll", t("poll.title")), desc: t("poll.desc"), submit: t("poll.submit"), options: true,
      fields: [
        { k: "title", label: t("poll.f.title"), type: "text", max: 80, required: true, ph: t("poll.f.titlePh") },
        { k: "content", label: t("poll.f.content"), type: "textarea", max: 1000, required: true, ph: t("poll.f.contentPh") },
        { k: "deadline", label: t("poll.f.deadline"), type: "datetime-local", required: true },
        { k: "multi", label: t("poll.f.multi"), type: "check", note: t("poll.f.multiNote") }
      ] },
    term: { kicker: "Settings", title: t("term.title"), desc: t("term.desc"), submit: t("common.save"),
      fields: [
        { k: "name", label: t("term.f.name"), type: "text", max: 40, required: true, ph: t("term.f.namePh") },
        { k: "progress", label: t("term.f.progress"), type: "number", min: 0, max: 100, required: true },
        { k: "note", label: t("term.f.note"), type: "text", max: 60, ph: t("term.f.notePh") }
      ] },
    goal: { kicker: "Settings", title: t("goal.title"), desc: t("goal.desc"), submit: t("common.save"),
      fields: [
        { k: "lead", label: t("goal.f.lead"), type: "text", max: 30, required: true, ph: t("goal.f.leadPh") },
        { k: "accent", label: t("goal.f.accent"), type: "text", max: 30, required: true, ph: t("goal.f.accentPh") },
        { k: "note", label: t("goal.f.note"), type: "text", max: 120 },
        { k: "count", label: t("goal.f.count"), type: "text", max: 4, ph: t("goal.f.countPh") }
      ] },
    recruit: { kicker: "Recruitment", title: t("office.recruitEdit"), desc: t("office.recruit"), submit: t("common.save"),
      fields: [
        { k: "period", label: "Period", type: "text", max: 60, ph: "26.04.20 – 26.05.05" },
        { k: "eligibility", label: "Eligibility", type: "text", max: 120 },
        { k: "process", label: "Process", type: "text", max: 120 },
        { k: "contact", label: "Contact", type: "text", max: 120 }
      ] }
  };
}

let closeModal = null;
function openForm(kind, row) {
  const FORMS = buildForms();
  const spec = FORMS[kind];
  if (!spec) return;
  const editing = !!row;
  let pre = kind === "term" ? ((S.settings || {}).term || {})
    : kind === "goal" ? ((S.settings || {}).goal || {})
    : kind === "recruit" ? ((S.settings || {}).recruit || {}) : {};
  if (editing) {
    pre = { ...row };
    if (kind === "material") pre.tags = (row.tags || []).join(", ");
    if (kind === "schedule" && row.start_at) pre.start_at = localInput(new Date(row.start_at));
    if (kind === "poll" && row.deadline) pre.deadline = localInput(new Date(row.deadline));
    if (kind === "notice") {
      pre.pinned = !!row.pinned;
      pre.signup = !!row.signup;
      if (row.start_at) pre.start_at = localInput(new Date(row.start_at));
    }
  }

  const fieldsHtml = spec.fields.map(f => {
    const v = pre[f.k] != null ? String(pre[f.k]) : "";
    if (f.type === "check") {
      if (editing && f.k === "multi") return "";
      return '<label class="f check"><input type="checkbox" name="' + f.k + '"' +
        (pre[f.k] ? " checked" : "") + "><span><b>" +
        esc(f.label) + "</b><small>" + esc(f.note || "") + "</small></span></label>";
    }
    const head = "<span>" + esc(f.label) + (f.hint ? "<em>" + esc(f.hint) + "</em>" : "") + "</span>";
    if (f.type === "select") {
      return '<label class="f">' + head + '<select name="' + f.k + '">' +
        f.options.map(o => '<option value="' + esc(o) + '"' + (String(pre[f.k]) === o ? " selected" : "") + ">" + esc(t("cat." + o)) + "</option>").join("") + "</select></label>";
    }
    if (f.type === "textarea") {
      return '<label class="f">' + head + '<textarea name="' + f.k + '"' + (f.required ? " required" : "") +
        (f.max ? ' maxlength="' + f.max + '"' : "") + ' placeholder="' + esc(f.ph || "") + '">' + esc(v) + "</textarea></label>";
    }
    const attrs = ['name="' + f.k + '"', 'type="' + f.type + '"',
      f.required ? "required" : "",
      (f.max != null && f.type !== "number") ? 'maxlength="' + f.max + '"' : "",
      (f.type === "number" && f.min != null) ? 'min="' + f.min + '"' : "",
      (f.type === "number" && f.max != null) ? 'max="' + f.max + '"' : "",
      'placeholder="' + esc(f.ph || "") + '"', v !== "" ? 'value="' + esc(v) + '"' : ""
    ].filter(Boolean).join(" ");
    return '<label class="f">' + head + "<input " + attrs + "></label>";
  }).join("");

  const yesNoPreset = LANG === "en" ? "Yes,No" : "찬성,반대";
  const optsHtml = (spec.options && !editing)
    ? '<fieldset class="opts"><legend>' + esc(t("opt.title")) + '<em>' + esc(t("opt.range")) + '</em></legend>' +
      '<div class="presets"><button type="button" class="btn sm" data-preset="' + esc(yesNoPreset) + '">' + esc(t("opt.presetYesNo")) + '</button>' +
      '<button type="button" class="btn sm" data-preset="1,2,3,4,5">' + esc(t("opt.presetScale")) + '</button></div>' +
      '<div id="opt-rows"></div><button type="button" class="addopt" id="add-opt">' + esc(t("opt.addOption")) + '</button></fieldset>'
    : "";

  const root = $("#modal-root");
  root.innerHTML =
    '<div class="scrim" role="dialog" aria-modal="true" aria-labelledby="sheet-title"><form class="sheet" id="sheet">' +
    '<button type="button" class="x" id="sheet-x" aria-label="' + esc(t("form.close")) + '">×</button>' +
    '<p class="eyebrow">' + esc(spec.kicker) + '</p><h2 id="sheet-title">' + esc(editing ? (spec.editTitle || spec.title) : spec.title) + "</h2><p>" + esc(editing ? t("form.editHint") : spec.desc) + "</p>" +
    '<div class="fields">' + fieldsHtml + optsHtml + "</div>" +
    '<button class="btn primary" type="submit" style="width:100%;margin-top:20px;padding:11px">' + esc(editing ? t("common.save") : spec.submit) + "</button>" +
    "</form></div>";

  const scrim = $(".scrim", root), sheet = $("#sheet", root);
  closeModal = () => { root.innerHTML = ""; closeModal = null; document.removeEventListener("keydown", onKey); };
  function onKey(ev) { if (ev.key === "Escape" && closeModal) closeModal(); }
  document.addEventListener("keydown", onKey);
  $("#sheet-x", root).addEventListener("click", () => closeModal());
  scrim.addEventListener("mousedown", ev => { if (ev.target === scrim) closeModal(); });

  const dt = sheet.querySelector('input[type="datetime-local"]');
  if (dt && !dt.value && kind !== "notice") {
    const d = new Date(Date.now() + 86400000); d.setMinutes(0, 0, 0); dt.value = localInput(d);
  }
  const dd = sheet.querySelector('input[type="date"]');
  if (dd && !dd.value) dd.value = dayKey(new Date());

  if (spec.options && !editing) {
    const rows = $("#opt-rows", sheet), addBtn = $("#add-opt", sheet);
    const sync = () => {
      $$(".orow", rows).forEach((r, i) => {
        r.querySelector("span").textContent = pad(i + 1);
        r.querySelector("button").disabled = rows.children.length <= 2;
      });
      addBtn.disabled = rows.children.length >= 10;
    };
    const addRow = (val, focus) => {
      if (rows.children.length >= 10) return;
      const row = document.createElement("div");
      row.className = "orow";
      row.innerHTML = '<span></span><input maxlength="60" placeholder="' + esc(t("opt.placeholder")) + '" required><button type="button" aria-label="' + esc(t("opt.removeLabel")) + '">×</button>';
      row.querySelector("input").value = val || "";
      row.querySelector("button").addEventListener("click", () => {
        if (rows.children.length <= 2) return toast(t("err.minTwoOptions"));
        row.remove(); sync();
      });
      rows.appendChild(row); sync();
      if (focus) row.querySelector("input").focus();
    };
    const reset = vals => { rows.innerHTML = ""; vals.forEach(v => addRow(v, false)); sync(); };
    addBtn.addEventListener("click", () => addRow("", true));
    $$("[data-preset]", sheet).forEach(b => b.addEventListener("click", () => reset(b.dataset.preset.split(","))));
    reset(["", ""]);
  }

  setTimeout(() => { const el = sheet.querySelector("input:not([type=checkbox]),textarea,select"); if (el) el.focus(); }, 20);
  sheet.addEventListener("submit", ev => { ev.preventDefault(); submitForm(kind, sheet, row); });
}

async function submitForm(kind, sheet, row) {
  const get = k => {
    const el = sheet.querySelector('[name="' + k + '"]');
    if (!el) return "";
    return el.type === "checkbox" ? el.checked : el.value.trim();
  };
  const btn = sheet.querySelector("button[type=submit]");
  const editing = !!row;
  const lock = () => { btn.disabled = true; };
  const unlock = () => { btn.disabled = false; };
  const send = (path, payload) => api(path, {
    method: editing ? "PATCH" : "POST",
    body: JSON.stringify(payload)
  });
  const okMsg = made => editing ? t("common.saved") : made;

  try {
    if (kind === "term" || kind === "goal" || kind === "recruit") {
      lock();
      const patch = kind === "term"
        ? { term: { name: get("name"), progress: Math.max(0, Math.min(100, Number(get("progress")) || 0)), note: get("note") } }
        : kind === "goal"
        ? { goal: { ...((S.settings || {}).goal || {}), lead: get("lead"), accent: get("accent"), note: get("note"), count: get("count") || "04" } }
        : { recruit: { period: get("period"), eligibility: get("eligibility"), process: get("process"), contact: get("contact") } };
      const data = await api("/api/settings", { method: "PUT", body: JSON.stringify({ settings: patch }) });
      S.settings = data.settings;
      renderChrome(); renderOffice(); closeModal();
      return toast(kind === "recruit" ? t("office.recruitSaved") : t("common.saved"));
    }

    if (kind === "notice") {
      if (!get("title") || !get("body")) return toast(t("err.needTitleBody"));
      lock();
      const nStart = get("start_at");
      await send("/api/notices" + (editing ? "/" + row.id : ""), {
        title: get("title"), body: get("body"), pinned: get("pinned"),
        signup: get("signup"),
        start_at: nStart ? new Date(nStart).toISOString() : null,
        location: get("location"),
        capacity: Number(get("capacity")) || 0
      });
      await reload("notices"); closeModal(); go("notices");
      return toast(okMsg(t("notice.posted")));
    }

    if (kind === "schedule") {
      if (!get("title") || !get("body")) return toast(t("err.needTitleBody"));
      const startAt = get("start_at");
      if (!toDate(startAt)) return toast(t("err.needDateTime"));
      lock();
      await send("/api/schedules" + (editing ? "/" + row.id : ""), {
        title: get("title"), body: get("body"), location: get("location"),
        start_at: new Date(startAt).toISOString()
      });
      await reload("schedules"); closeModal(); go("calendar");
      if (!editing && S.gcal && S.gcal.configured) {
        return toast(t("schedule.postedWithGcalHint"));
      }
      return toast(okMsg(t("schedule.posted")));
    }

    if (kind === "activity") {
      const headcount = Number(get("headcount"));
      if (!get("content")) return toast(t("err.needActivityContent"));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(get("activity_date"))) return toast(t("err.needActivityDate"));
      if (!Number.isInteger(headcount) || headcount < 1) return toast(t("err.needHeadcount"));
      lock();
      await send("/api/activities" + (editing ? "/" + row.id : ""), {
        content: get("content"), category: get("category") || "기타",
        activity_date: get("activity_date"), headcount
      });
      await reload("activities"); closeModal(); go("activities");
      return toast(okMsg(t("activity.posted")));
    }

    if (kind === "material") {
      if (!get("name")) return toast(t("err.needMaterialName"));
      if (!/^https?:\/\//i.test(get("url"))) return toast(t("err.needValidUrl"));
      lock();
      await send("/api/materials" + (editing ? "/" + row.id : ""), {
        name: get("name"), url: get("url"),
        tags: get("tags").split(",").map(t2 => t2.trim()).filter(Boolean)
      });
      await reload("materials"); closeModal(); go("archive");
      return toast(okMsg(t("material.posted")));
    }

    if (kind === "idea") {
      if (!get("title") || !get("body")) return toast(t("err.needTitleBody"));
      lock();
      await send("/api/ideas" + (editing ? "/" + row.id : ""),
        { title: get("title"), body: get("body") });
      await reload("ideas"); closeModal(); go("ideas");
      return toast(okMsg(t("idea.posted")));
    }

    if (kind === "poll") {
      if (!get("title") || !get("content")) return toast(t("err.needTitleBody"));
      const dl = toDate(get("deadline"));
      if (!dl) return toast(t("err.needDeadline"));
      if (!editing && dl.getTime() <= Date.now()) return toast(t("err.deadlineFuture"));
      const payload = { title: get("title"), content: get("content"), deadline: dl.toISOString() };
      if (!editing) {
        const labels = $$("#opt-rows input", sheet).map(i => i.value.trim()).filter(Boolean);
        if (labels.length < 2) return toast(t("err.needTwoOptions"));
        if (new Set(labels.map(l => l.toLocaleLowerCase(LANG === "en" ? "en-US" : "ko-KR"))).size !== labels.length) return toast(t("err.dupOptions"));
        payload.options = labels;
        payload.multi = get("multi");
      }
      lock();
      await send("/api/votes" + (editing ? "/" + row.id : ""), payload);
      await reload("polls"); closeModal(); go("votes");
      return toast(okMsg(t("poll.posted")));
    }
  } catch (err) {
    unlock();
    toast(err.message);
  }
}

/* ---------------- boot ---------------- */
(async function boot() {
  applyStaticI18n();
  setLangToggleLabel();
  buildNav();
  go("home");

  let config;
  try { config = await api("/api/config"); }
  catch { showGate("setup"); return; }

  if (!config.configured) { showGate("setup"); return; }

  let me;
  try { me = (await api("/api/me")).user; }
  catch { me = { authenticated: false, role: "visitor" }; }

  if (!me.authenticated) {
    showGate("login");
    initGoogle(config.googleClientId);
    return;
  }
  if (me.role === "pending") { showGate("pending", me.email || ""); return; }
  if (me.role === "rejected") { showGate("rejected", me.email || ""); return; }

  S.me = me;
  await revealApp();
  await loadAll();
  if (isAdmin()) loadMembers();
})();

})();
