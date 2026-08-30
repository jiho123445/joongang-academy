/**
 * tests/rules/firestore.test.ts
 *
 * Firebase 에뮬레이터를 이용한 firestore.rules 자동 테스트입니다.
 * 실제 프로덕션 데이터에는 전혀 손대지 않고, 로컬(또는 CI)에서만 뜨는
 * 가짜 Firestore 인스턴스를 상대로 "이 규칙이 의도한 대로 막고 여는지"를
 * 검증합니다.
 *
 * 로컬에서 실행하는 방법:
 *   npm run test:rules
 * (내부적으로 `firebase emulators:exec`가 에뮬레이터를 띄우고, 그 안에서
 *  vitest를 돌린 뒤 자동으로 에뮬레이터를 종료합니다. Java(JRE)가 설치돼
 *  있어야 합니다 - 없으면 firebase-tools가 안내 메시지를 보여줍니다.)
 *
 * ⚠️ 이 환경(Claude 작업 샌드박스)에서는 Firebase 에뮬레이터 실행 파일을
 * 구글 서버에서 내려받을 수 없어(네트워크 제한) 이 테스트를 실제로 돌려서
 * 통과하는지 확인하지 못했습니다. GitHub Actions(rules-test.yml)에서는
 * 정상적으로 인터넷이 되므로 거기서 실제로 검증됩니다 - 푸시 후 Actions
 * 탭에서 결과를 확인해 주세요.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";

let testEnv: RulesTestEnvironment;

const ADMIN_UID = "test-admin-uid";
const STUDENT_UID = "test-student-uid";
const OTHER_UID = "test-other-uid";

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "joongang-homepage-rules-test",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("notices / courses / popular_courses — 공개 컬렉션", () => {
  it("[OK] 비로그인 사용자도 공지사항을 읽을 수 있다", async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "notices/n1"), { title: "test" });
    });
    await assertSucceeds(getDoc(doc(anon, "notices/n1")));
  });

  it("[차단] 비로그인 사용자는 공지사항을 쓸 수 없다", async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(anon, "notices/n1"), { title: "spam" }));
  });

  it("[차단] 관리자가 아닌 로그인 사용자는 공지사항을 쓸 수 없다", async () => {
    const student = testEnv.authenticatedContext(STUDENT_UID).firestore();
    await assertFails(setDoc(doc(student, "notices/n1"), { title: "hack" }));
  });

  it("[OK] 관리자는 공지사항을 쓸 수 있다", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `admins/${ADMIN_UID}`), { email: "admin@test.com" });
    });
    const admin = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(setDoc(doc(admin, "notices/n1"), { title: "공식 공지" }));
  });
});

describe("applications — 수강신청 (개인정보 포함)", () => {
  it("[OK] 유효한 형식이면 누구나 수강신청을 생성할 수 있다", async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      addDoc(collection(anon, "applications"), {
        name: "홍길동",
        phone: "010-1234-5678",
        message: "문의합니다",
      })
    );
  });

  it("[차단] 이름이 50자를 초과하면 거부된다", async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      addDoc(collection(anon, "applications"), {
        name: "가".repeat(51),
        phone: "010-1234-5678",
      })
    );
  });

  it("[차단] 전화번호가 너무 짧으면 거부된다", async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      addDoc(collection(anon, "applications"), {
        name: "홍길동",
        phone: "123",
      })
    );
  });

  it("[차단] 비로그인 사용자는 수강신청 목록을 읽을 수 없다", async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDocs(collection(anon, "applications")));
  });
});

describe("materials — 자료실 (학원서식 비공개, 예제서식 공개)", () => {
  const seedMaterials = async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "materials/public-1"), {
        title: "예제 파일",
        studentVisible: true,
      });
      await setDoc(doc(ctx.firestore(), "materials/internal-1"), {
        title: "학원서식",
        studentVisible: false,
      });
      await setDoc(doc(ctx.firestore(), `students/${STUDENT_UID}`), {
        name: "학생",
        status: "승인됨",
      });
    });
  };

  it("[차단] 비로그인 사용자는 자료실을 읽을 수 없다", async () => {
    await seedMaterials();
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, "materials/public-1")));
  });

  it("[OK] 승인된 수강생은 공개(예제서식) 자료를 읽을 수 있다", async () => {
    await seedMaterials();
    const student = testEnv.authenticatedContext(STUDENT_UID).firestore();
    await assertSucceeds(getDoc(doc(student, "materials/public-1")));
  });

  it("[차단] 승인된 수강생도 학원서식(비공개)은 읽을 수 없다", async () => {
    await seedMaterials();
    const student = testEnv.authenticatedContext(STUDENT_UID).firestore();
    await assertFails(getDoc(doc(student, "materials/internal-1")));
  });

  it("[OK] 관리자는 학원서식도 읽을 수 있다", async () => {
    await seedMaterials();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `admins/${ADMIN_UID}`), { email: "admin@test.com" });
    });
    const admin = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(getDoc(doc(admin, "materials/internal-1")));
  });
});

describe("students — 수강생 회원가입", () => {
  it("[OK] 본인 UID로, 승인대기 상태로, 올바른 전화번호 형식이면 가입할 수 있다", async () => {
    const student = testEnv.authenticatedContext(STUDENT_UID).firestore();
    await assertSucceeds(
      setDoc(doc(student, `students/${STUDENT_UID}`), {
        name: "홍길동",
        phone: "010-1234-5678",
        email: "test@test.com",
        status: "승인대기",
      })
    );
  });

  it("[차단] 가입 시 스스로 '승인됨' 상태로 만들 수 없다", async () => {
    const student = testEnv.authenticatedContext(STUDENT_UID).firestore();
    await assertFails(
      setDoc(doc(student, `students/${STUDENT_UID}`), {
        name: "홍길동",
        phone: "010-1234-5678",
        email: "test@test.com",
        status: "승인됨",
      })
    );
  });

  it("[차단] 전화번호 형식이 틀리면 가입할 수 없다", async () => {
    const student = testEnv.authenticatedContext(STUDENT_UID).firestore();
    await assertFails(
      setDoc(doc(student, `students/${STUDENT_UID}`), {
        name: "홍길동",
        phone: "01012345678",
        email: "test@test.com",
        status: "승인대기",
      })
    );
  });

  it("[차단] 다른 사람 UID로는 가입할 수 없다", async () => {
    const student = testEnv.authenticatedContext(STUDENT_UID).firestore();
    await assertFails(
      setDoc(doc(student, `students/${OTHER_UID}`), {
        name: "홍길동",
        phone: "010-1234-5678",
        email: "test@test.com",
        status: "승인대기",
      })
    );
  });

  it("[차단] 학생은 자신의 승인 상태를 스스로 바꿀 수 없다", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `students/${STUDENT_UID}`), {
        name: "홍길동",
        status: "승인대기",
      });
    });
    const student = testEnv.authenticatedContext(STUDENT_UID).firestore();
    await assertFails(updateDoc(doc(student, `students/${STUDENT_UID}`), { status: "승인됨" }));
  });
});

describe("phoneRegistry — 전화번호 중복 가입 방지 (2026-08 우회 경로 수정)", () => {
  it("[OK] 회원가입 실패 롤백: students 문서가 없으면 본인 전화번호 등록을 스스로 지울 수 있다", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "phoneRegistry/01012345678"), { uid: STUDENT_UID });
    });
    const student = testEnv.authenticatedContext(STUDENT_UID).firestore();
    await assertSucceeds(deleteDoc(doc(student, "phoneRegistry/01012345678")));
  });

  it("[차단] 가입이 정상 완료된(students 문서가 있는) 뒤에는 본인 전화번호 등록을 지울 수 없다", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "phoneRegistry/01012345678"), { uid: STUDENT_UID });
      await setDoc(doc(ctx.firestore(), `students/${STUDENT_UID}`), {
        name: "홍길동",
        status: "승인대기",
      });
    });
    const student = testEnv.authenticatedContext(STUDENT_UID).firestore();
    await assertFails(deleteDoc(doc(student, "phoneRegistry/01012345678")));
  });

  it("[OK] 관리자는 언제든 전화번호 등록을 지울 수 있다", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "phoneRegistry/01012345678"), { uid: STUDENT_UID });
      await setDoc(doc(ctx.firestore(), `students/${STUDENT_UID}`), {
        name: "홍길동",
        status: "승인대기",
      });
      await setDoc(doc(ctx.firestore(), `admins/${ADMIN_UID}`), { email: "admin@test.com" });
    });
    const admin = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(deleteDoc(doc(admin, "phoneRegistry/01012345678")));
  });

  it("[차단] 다른 사람 명의로 전화번호를 등록할 수 없다", async () => {
    const student = testEnv.authenticatedContext(STUDENT_UID).firestore();
    await assertFails(
      setDoc(doc(student, "phoneRegistry/01099998888"), { uid: OTHER_UID })
    );
  });
});

describe("errorLogs — 클라이언트 오류 리포트", () => {
  it("[OK] 필수 필드만 있으면 비로그인 사용자도 오류를 기록할 수 있다", async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      addDoc(collection(anon, "errorLogs"), {
        message: "TypeError: something failed",
        url: "https://www.jahrd.co.kr/courses",
        createdAt: new Date().toISOString(),
      })
    );
  });

  it("[차단] 허용되지 않은 필드가 섞여 있으면 거부된다", async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      addDoc(collection(anon, "errorLogs"), {
        message: "test",
        url: "https://www.jahrd.co.kr/",
        createdAt: new Date().toISOString(),
        adminOverride: true,
      })
    );
  });

  it("[차단] 비로그인 사용자는 오류 로그를 읽을 수 없다", async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDocs(collection(anon, "errorLogs")));
  });
});
