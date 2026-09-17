// 환경 변수 파일, Better Auth, MongoDB를 사용하기 위해 필요한 모듈을 불러옵니다.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin as adminPlugin } from "better-auth/plugins";
import { MongoClient } from "mongodb";

// 단어를 분류할 때 사용할 여섯 개의 카테고리를 정의합니다.
const categories = [
  "웹 기초",
  "React",
  "데이터",
  "Next.js",
  "JavaScript",
  "기타",
];

// 코드 예시에서 사용할 언어 식별자를 한곳에 정의합니다.
const codeLanguages = ["javascript", "jsx", "bash", "text"];

// 직역 의미가 "영어 원어 : 한국어 뜻" 형식인지 확인합니다.
function isValidMeaning(meaning) {
  if (typeof meaning !== "string") {
    return false;
  }

  const meaningParts = meaning.split(" : ");

  return (
    meaningParts.length === 2 &&
    meaningParts.every((meaningPart) => meaningPart.trim().length > 0)
  );
}

// 카테고리마다 5개씩 저장할 총 30개의 초기 단어를 정의합니다.
const seedWords = [
  {
    name: "HTTP",
    meaning: "Hypertext Transfer Protocol : 하이퍼텍스트 전송 규약",
    slug: "http",
    description:
      "웹에서 브라우저와 서버가 요청과 응답을 주고받을 때 사용하는 통신 규칙입니다.",
    category: "웹 기초",
    tags: ["통신", "요청과 응답"],
    codeExample: `const response = await fetch("/api/words");
const words = await response.json();

console.log(words);`,
    codeLanguage: "javascript",
  },
  {
    name: "URL",
    meaning: "Uniform Resource Locator : 통합 자원 위치 지정자",
    slug: "url",
    description:
      "웹페이지나 이미지처럼 인터넷에 있는 자원의 위치를 나타내는 주소입니다.",
    category: "웹 기초",
    tags: ["주소"],
    codeExample: `const url = new URL("https://example.com/words?category=React");

console.log(url.pathname);
console.log(url.searchParams.get("category"));`,
    codeLanguage: "javascript",
  },
  {
    name: "브라우저",
    meaning: "browser : 둘러보는 사람이나 도구",
    slug: "browser",
    description:
      "웹페이지를 불러와 화면에 표시하고 사용자가 페이지와 상호작용할 수 있게 하는 프로그램입니다.",
    category: "웹 기초",
    tags: ["클라이언트"],
    codeExample: `const title = document.querySelector("h1");

title.textContent = "개발자 단어장";`,
    codeLanguage: "javascript",
  },
  {
    name: "클라이언트",
    meaning: "client : 의뢰인, 고객",
    slug: "client",
    description:
      "서버에 데이터나 작업을 요청하고 서버가 보내 준 결과를 사용하는 프로그램입니다. 웹 브라우저가 대표적인 예입니다.",
    category: "웹 기초",
    tags: ["요청"],
    codeExample: `const response = await fetch("/api/words/http");
const word = await response.json();

console.log(word.name);`,
    codeLanguage: "javascript",
  },
  {
    name: "서버",
    meaning: "server : 제공하는 사람이나 장치",
    slug: "server",
    description:
      "클라이언트의 요청을 받아 필요한 작업을 처리하고 결과를 보내 주는 프로그램이나 컴퓨터입니다.",
    category: "웹 기초",
    tags: ["응답"],
    codeExample: `import { createServer } from "node:http";

createServer((request, response) => {
  response.end("Hello from the server");
}).listen(3000);`,
    codeLanguage: "javascript",
  },
  {
    name: "컴포넌트",
    meaning: "component : 구성 요소",
    slug: "component",
    description:
      "버튼이나 검색창처럼 화면의 일부를 구성하는 코드 단위입니다. 같은 컴포넌트를 여러 곳에서 재사용할 수 있습니다.",
    category: "React",
    tags: ["UI", "재사용"],
    codeExample: `export default function WordTitle() {
  return <h2>HTTP</h2>;
}`,
    codeLanguage: "jsx",
  },
  {
    name: "Props",
    meaning: "properties : 속성들",
    slug: "props",
    description:
      "부모 컴포넌트가 자식 컴포넌트에 전달하는 데이터입니다. 전달받은 컴포넌트는 Props를 직접 수정하지 않고 사용합니다.",
    category: "React",
    tags: ["데이터 전달"],
    codeExample: `function WordTitle({ name }) {
  return <h2>{name}</h2>;
}

export default function Page() {
  return <WordTitle name="HTTP" />;
}`,
    codeLanguage: "jsx",
  },
  {
    name: "State",
    meaning: "state : 상태",
    slug: "state",
    description:
      "컴포넌트가 기억하는 데이터입니다. 입력창의 내용이나 버튼을 누른 횟수처럼 바뀌는 값을 관리할 때 사용합니다.",
    category: "React",
    tags: ["상태 관리"],
    codeExample: `import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);

  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}`,
    codeLanguage: "jsx",
  },
  {
    name: "useState",
    meaning: "use state : 상태를 사용하다",
    slug: "use-state",
    description:
      "함수형 컴포넌트에서 State를 만들고 그 값을 변경할 수 있게 해 주는 Hook입니다.",
    category: "React",
    tags: ["Hook", "상태 관리"],
    codeExample: `import { useState } from "react";

export default function SearchInput() {
  const [keyword, setKeyword] = useState("");

  return (
    <input
      value={keyword}
      onChange={(event) => setKeyword(event.target.value)}
    />
  );
}`,
    codeLanguage: "jsx",
  },
  {
    name: "JSX",
    meaning: "JavaScript XML : 자바스크립트 XML",
    slug: "jsx",
    description:
      "JavaScript 코드 안에서 HTML과 비슷한 문법으로 화면 구조를 표현하는 문법입니다.",
    category: "React",
    tags: ["화면 작성"],
    codeExample: `const wordName = "HTTP";

export default function Word() {
  return <strong>{wordName}</strong>;
}`,
    codeLanguage: "jsx",
  },
  {
    name: "데이터베이스",
    meaning: "database : 데이터 저장소",
    slug: "database",
    description:
      "여러 데이터를 저장하고 필요한 데이터를 찾거나 변경할 수 있도록 관리하는 시스템입니다.",
    category: "데이터",
    tags: ["저장"],
    codeExample: `import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();

const database = client.db("dev-words");`,
    codeLanguage: "javascript",
  },
  {
    name: "MongoDB",
    meaning: "MongoDB : Mongo라는 이름의 데이터베이스",
    slug: "mongodb",
    description:
      "데이터를 문서 형태로 저장하는 데이터베이스입니다. 단어의 이름, 설명, 태그 등을 하나의 문서로 묶어 저장할 수 있습니다.",
    category: "데이터",
    tags: ["NoSQL", "문서"],
    codeExample: `const database = client.db("dev-words");
const words = database.collection("words");

console.log(await words.countDocuments());`,
    codeLanguage: "javascript",
  },
  {
    name: "컬렉션",
    meaning: "collection : 모음",
    slug: "collection",
    description:
      "MongoDB에서 관련된 문서들을 모아 두는 공간입니다. 예를 들어 여러 단어 문서를 하나의 컬렉션에 저장할 수 있습니다.",
    category: "데이터",
    tags: ["MongoDB"],
    codeExample: `const wordCollection = database.collection("words");
const words = await wordCollection.find().toArray();

console.log(words);`,
    codeLanguage: "javascript",
  },
  {
    name: "문서",
    meaning: "document : 문서, 기록",
    slug: "document",
    description:
      "MongoDB에 저장되는 데이터 한 건입니다. 여러 필드와 값으로 구성되며 단어 하나의 정보를 담을 수 있습니다.",
    category: "데이터",
    tags: ["MongoDB", "필드"],
    codeExample: `await database.collection("words").insertOne({
  name: "HTTP",
  category: "웹 기초",
  tags: ["통신"],
});`,
    codeLanguage: "javascript",
  },
  {
    name: "쿼리",
    meaning: "query : 질문, 문의",
    slug: "query",
    description:
      "데이터베이스에 원하는 데이터를 찾거나 처리하도록 요청하는 명령입니다. 특정 카테고리의 단어를 찾는 요청이 한 예입니다.",
    category: "데이터",
    tags: ["조회"],
    codeExample: `const reactWords = await database
  .collection("words")
  .find({ category: "React" })
  .toArray();`,
    codeLanguage: "javascript",
  },
  {
    name: "App Router",
    meaning: "app router : 애플리케이션의 경로 안내자",
    slug: "app-router",
    description:
      "Next.js의 app 폴더 구조를 이용해 페이지 주소와 공통 화면 구조를 구성하는 라우팅 방식입니다.",
    category: "Next.js",
    tags: ["라우팅"],
    codeExample: `app/
  layout.js
  page.js
  words/
    [slug]/
      page.js`,
    codeLanguage: "text",
  },
  {
    name: "Layout",
    meaning: "layout : 배치, 화면 구성",
    slug: "layout",
    description:
      "여러 페이지가 함께 사용하는 화면 구조입니다. 공통 메뉴나 페이지를 감싸는 틀을 구성할 때 사용합니다.",
    category: "Next.js",
    tags: ["공통 UI"],
    codeExample: `export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}`,
    codeLanguage: "jsx",
  },
  {
    name: "동적 라우팅",
    meaning: "dynamic routing : 동적으로 경로를 정하는 것",
    slug: "dynamic-routing",
    description:
      "주소의 일부를 변수처럼 사용해 서로 다른 내용을 보여주는 방식입니다. 단어 슬러그에 따라 해당 단어의 상세 화면을 보여줄 수 있습니다.",
    category: "Next.js",
    tags: ["라우팅", "URL"],
    codeExample: `export default async function WordPage({ params }) {
  const { slug } = await params;

  return <h1>{slug}</h1>;
}`,
    codeLanguage: "jsx",
  },
  {
    name: "서버 컴포넌트",
    meaning: "server component : 서버 구성 요소",
    slug: "server-component",
    description:
      "서버에서 실행되는 React 컴포넌트입니다. 데이터베이스에서 데이터를 가져오고 화면을 구성할 수 있습니다.",
    category: "Next.js",
    tags: ["서버", "React"],
    codeExample: `import { connection } from "next/server";

export default async function WordListPage() {
  await connection();

  return <h1>개발자 단어장</h1>;
}`,
    codeLanguage: "jsx",
  },
  {
    name: "Server Action",
    meaning: "server action : 서버에서 하는 동작",
    slug: "server-action",
    description:
      "폼 제출이나 버튼 동작에서 호출하여 서버에서 실행하는 비동기 함수입니다. 데이터를 등록하거나 수정하는 작업에 사용할 수 있습니다.",
    category: "Next.js",
    tags: ["서버", "폼"],
    codeExample: `"use server";

export async function saveWord(formData) {
  const name = String(formData.get("name"));

  console.log(name);
}`,
    codeLanguage: "javascript",
  },
  {
    name: "변수",
    meaning: "variable : 변할 수 있는 것",
    slug: "variable",
    description:
      "값을 저장하고 이름을 붙여 다시 사용할 수 있게 하는 방법입니다. 사용자 이름이나 검색어 같은 값을 다룰 때 사용합니다.",
    category: "JavaScript",
    tags: ["기초 문법"],
    codeExample: `const searchKeyword = "React";

console.log(searchKeyword);`,
    codeLanguage: "javascript",
  },
  {
    name: "함수",
    meaning: "function : 기능, 작용",
    slug: "function",
    description:
      "특정 작업을 수행하는 코드를 묶어 두고 필요할 때 호출하는 단위입니다. 값을 전달받고 처리 결과를 반환할 수 있습니다.",
    category: "JavaScript",
    tags: ["재사용"],
    codeExample: `function describeWord(name) {
  return name + " 단어를 공부합니다.";
}

console.log(describeWord("HTTP"));`,
    codeLanguage: "javascript",
  },
  {
    name: "배열",
    meaning: "array : 가지런히 늘어선 배열",
    slug: "array",
    description:
      "여러 값을 순서대로 담는 자료형입니다. 여러 단어의 목록이나 한 단어의 태그를 저장할 때 사용할 수 있습니다.",
    category: "JavaScript",
    tags: ["자료형", "목록"],
    codeExample: `const tags = ["JavaScript", "배열", "목록"];

console.log(tags[0]);`,
    codeLanguage: "javascript",
  },
  {
    name: "객체",
    meaning: "object : 대상, 물체",
    slug: "object",
    description:
      "관련된 데이터를 속성 이름과 값의 쌍으로 묶는 자료형입니다. 단어 하나의 이름, 설명, 카테고리를 함께 표현할 수 있습니다.",
    category: "JavaScript",
    tags: ["자료형"],
    codeExample: `const word = {
  name: "HTTP",
  category: "웹 기초",
  tags: ["통신", "요청"],
};

console.log(word.name);`,
    codeLanguage: "javascript",
  },
  {
    name: "Promise",
    meaning: "promise : 약속",
    slug: "promise",
    description:
      "비동기 작업의 성공 결과나 실패 이유를 다루는 객체입니다. 서버 요청처럼 결과가 나중에 준비되는 상황에 사용합니다.",
    category: "JavaScript",
    tags: ["비동기"],
    codeExample: `async function loadWords() {
  const response = await fetch("/api/words");
  return response.json();
}

const words = await loadWords();`,
    codeLanguage: "javascript",
  },
  {
    name: "Git",
    meaning: "Git : 버전 관리 도구의 고유 이름",
    slug: "git",
    description:
      "파일의 변경 이력을 기록하고 관리하는 버전 관리 도구입니다. 이전 변경을 확인하거나 여러 사람이 함께 개발할 때 사용합니다.",
    category: "기타",
    tags: ["버전 관리"],
    codeExample: `git status
git log --oneline`,
    codeLanguage: "bash",
  },
  {
    name: "커밋",
    meaning: "commit : 맡기다, 확정하다",
    slug: "commit",
    description:
      "Git에서 선택한 파일의 변경 내용을 하나의 기록으로 남기는 작업입니다. 어떤 변경인지 설명하는 메시지를 함께 작성합니다.",
    category: "기타",
    tags: ["Git", "변경 이력"],
    codeExample: `git add .
git commit -m "단어 설명 추가"`,
    codeLanguage: "bash",
  },
  {
    name: "브랜치",
    meaning: "branch : 나무의 가지",
    slug: "branch",
    description:
      "Git에서 다른 작업과 구분해 변경을 쌓아 갈 수 있는 개발 흐름입니다. 새 기능을 별도로 개발할 때 사용할 수 있습니다.",
    category: "기타",
    tags: ["Git"],
    codeExample: `git switch -c feature/word-search
git branch`,
    codeLanguage: "bash",
  },
  {
    name: "디버깅",
    meaning: "debugging : 벌레를 제거하는 것",
    slug: "debugging",
    description:
      "프로그램이 예상과 다르게 동작하는 원인을 찾고 수정하는 과정입니다. 오류 메시지나 변수 값을 확인하며 문제를 좁혀 갑니다.",
    category: "기타",
    tags: [],
    codeExample: `const selectedCategory = "React";

console.log("선택한 카테고리:", selectedCategory);`,
    codeLanguage: "javascript",
  },
  {
    name: "리팩터링",
    meaning: "refactoring : 구성 요소를 다시 정리하는 것",
    slug: "refactoring",
    description:
      "프로그램의 외부 동작을 유지하면서 내부 코드 구조를 개선하는 작업입니다. 읽기 쉽고 수정하기 편한 코드로 정리하는 것이 목적입니다.",
    category: "기타",
    tags: ["코드 개선"],
    codeExample: `function normalizeWord(word) {
  return word.trim().toLowerCase();
}

console.log(normalizeWord("  React  "));`,
    codeLanguage: "javascript",
  },
];

// Better Auth로 생성할 관리자 1명과 일반 사용자 2명의 정보를 정의합니다.
const seedUsers = [
  {
    name: "관리자 학습자",
    email: "admin@ts.com",
    password: "1234",
    role: "admin",
  },
  {
    name: "React 학습자",
    email: "user1@ts.com",
    password: "1234",
    role: "user",
  },
  {
    name: "JavaScript 학습자",
    email: "user2@ts.com",
    password: "1234",
    role: "user",
  },
];

// 세 사용자가 서로 다른 카테고리의 단어에 남길 초기 개인 메모를 정의합니다.
const seedMemos = [
  {
    userEmail: "admin@ts.com",
    wordSlug: "http",
    content:
      "요청은 클라이언트가 보내고 응답은 서버가 보낸다. 브라우저에서 페이지를 여는 상황으로 생각해 보자.",
  },
  {
    userEmail: "user1@ts.com",
    wordSlug: "use-state",
    content:
      "입력창의 값처럼 화면에서 바뀌는 데이터를 관리할 때 사용한다. 상태를 변경하는 함수와 함께 사용한다는 점을 기억하자.",
  },
  {
    userEmail: "user2@ts.com",
    wordSlug: "array",
    content:
      "여러 단어를 하나의 목록으로 담을 수 있다. 첫 번째 항목의 인덱스는 0이고 태그도 배열로 저장한다.",
  },
];

// 프로젝트 루트의 .env.local 또는 .env 파일에서 환경 변수를 불러옵니다.
function loadLocalEnvironmentVariables() {
  const environmentFilePaths = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), ".env"),
  ];

  for (const environmentFilePath of environmentFilePaths) {
    if (existsSync(environmentFilePath)) {
      process.loadEnvFile(environmentFilePath);
    }
  }
}

// DB에 연결하기 전에 초기 데이터의 개수, 형식, 중복 여부를 검사합니다.
function validateSeedData() {
  // 전체 단어 수와 카테고리별 단어 수가 약속한 구성과 같은지 확인합니다.
  if (seedWords.length !== 30) {
    throw new Error("초기 단어는 정확히 30개여야 합니다.");
  }

  for (const category of categories) {
    const wordCount = seedWords.filter(
      (word) => word.category === category
    ).length;

    if (wordCount !== 5) {
      throw new Error(
        `${category} 카테고리에는 정확히 5개의 단어가 필요합니다.`
      );
    }
  }

  // 각 단어의 필수값, 직역 의미, 분류, 주소, 코드 예시가 올바른지 확인합니다.
  const slugs = new Set();

  for (const word of seedWords) {
    if (!word.name.trim() || !word.description.trim()) {
      throw new Error("모든 단어에는 이름과 설명이 필요합니다.");
    }

    if (!isValidMeaning(word.meaning)) {
      throw new Error(
        `${word.name}의 meaning은 "영어 원어 : 한국어 뜻" 형식이어야 합니다.`
      );
    }

    if (!categories.includes(word.category)) {
      throw new Error(`${word.name}의 카테고리가 올바르지 않습니다.`);
    }

    if (!/^[a-z0-9-]+$/.test(word.slug)) {
      throw new Error(
        `${word.name}의 slug는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.`
      );
    }

    if (slugs.has(word.slug)) {
      throw new Error(`${word.slug} slug가 중복되었습니다.`);
    }

    if (
      !Array.isArray(word.tags) ||
      word.tags.some((tag) => typeof tag !== "string" || !tag.trim())
    ) {
      throw new Error(`${word.name}의 tags는 문자열 배열이어야 합니다.`);
    }

    if (typeof word.codeExample !== "string" || !word.codeExample.trim()) {
      throw new Error(`${word.name}의 codeExample은 비어 있을 수 없습니다.`);
    }

    if (!codeLanguages.includes(word.codeLanguage)) {
      throw new Error(
        `${word.name}의 codeLanguage는 ${codeLanguages.join(", ")} 중 하나여야 합니다.`
      );
    }

    slugs.add(word.slug);
  }

  // 초기 사용자 수와 각 사용자의 이메일, 비밀번호, 역할을 확인합니다.
  if (seedUsers.length !== 3) {
    throw new Error("초기 사용자는 정확히 3명이어야 합니다.");
  }

  const emails = new Set();

  for (const user of seedUsers) {
    if (!user.email.includes("@")) {
      throw new Error(`${user.email}은 올바른 이메일 형식이 아닙니다.`);
    }

    if (user.password.length < 4) {
      throw new Error(`${user.email}의 비밀번호는 4자 이상이어야 합니다.`);
    }

    if (!new Set(["admin", "user"]).has(user.role)) {
      throw new Error(`${user.email}의 역할이 올바르지 않습니다.`);
    }

    if (emails.has(user.email)) {
      throw new Error(`${user.email} 이메일이 중복되었습니다.`);
    }

    emails.add(user.email);
  }

  // 초기 사용자 중 관리자 역할을 가진 사용자가 정확히 한 명인지 확인합니다.
  const adminCount = seedUsers.filter((user) => user.role === "admin").length;

  if (adminCount !== 1) {
    throw new Error("초기 사용자 중 관리자는 정확히 1명이어야 합니다.");
  }

  // 초기 메모가 정확히 세 개이고 모두 작성할 내용을 가지고 있는지 확인합니다.
  if (seedMemos.length !== 3) {
    throw new Error("초기 개인 메모는 정확히 3개여야 합니다.");
  }

  const wordsBySlug = new Map(seedWords.map((word) => [word.slug, word]));
  const memoCategories = new Set();

  for (const memo of seedMemos) {
    if (!emails.has(memo.userEmail)) {
      throw new Error(`${memo.userEmail} 사용자를 초기 사용자에서 찾지 못했습니다.`);
    }

    const memoWord = wordsBySlug.get(memo.wordSlug);

    if (!memoWord) {
      throw new Error(`${memo.wordSlug} 단어를 초기 단어에서 찾지 못했습니다.`);
    }

    if (!memo.content.trim()) {
      throw new Error(`${memo.wordSlug} 메모의 내용이 비어 있습니다.`);
    }

    memoCategories.add(memoWord.category);
  }

  // 세 메모가 서로 다른 카테고리의 단어에 연결되는지 확인합니다.
  if (memoCategories.size !== seedMemos.length) {
    throw new Error("초기 개인 메모는 서로 다른 카테고리의 단어에 작성해야 합니다.");
  }
}

// 중복 데이터 생성을 DB 단계에서도 막을 수 있도록 고유 인덱스를 만듭니다.
async function createIndexes(database) {
  await database.collection("quizQuestions").createIndex({ difficulty: 1, category: 1 });
  await database.collection("quizSessions").createIndex({ userId: 1, createdAt: -1 });
  await database.collection("studyNotes").createIndex({ userId: 1, dateKey: 1 });
  await database.collection("scrapHistory").createIndex({ userId: 1, createdAt: 1 });
  await database.collection("favorites").createIndex({ userId: 1, wordId: 1 }, { unique: true, name: "unique_favorite_per_user_and_word" });
  await database.collection("recentWords").createIndex({ userId: 1 }, { unique: true, name: "unique_recent_words_per_user" });
  // 같은 slug를 사용하는 단어가 두 개 이상 저장되지 않게 합니다.
  await database.collection("words").createIndex(
    { slug: 1 },
    {
      unique: true,
      name: "unique_word_slug",
    }
  );

  // 한 사용자가 같은 단어에 개인 메모를 하나만 작성할 수 있게 합니다.
  await database.collection("memos").createIndex(
    { userId: 1, wordId: 1 },
    {
      unique: true,
      name: "unique_memo_per_user_and_word",
    }
  );

  // 한 사용자의 동일한 새 단어 요청은 pending 상태에서 하나만 허용합니다.
  await database.collection("wordRequests").createIndex(
    { userId: 1, normalizedWord: 1 },
    {
      unique: true,
      name: "unique_pending_word_request_per_user",
      partialFilterExpression: {
        status: "pending",
      },
    }
  );

  // 한 사용자의 동일한 단어 수정 요청은 pending 상태에서 하나만 허용합니다.
  await database.collection("wordEditRequests").createIndex(
    { userId: 1, wordId: 1 },
    {
      unique: true,
      name: "unique_pending_word_edit_request_per_user",
      partialFilterExpression: {
        status: "pending",
      },
    }
  );

  // 하루 동안의 AI 기능 사용 횟수를 사용자와 기능 종류별로 하나만 저장합니다.
  await database.collection("aiUsage").createIndex(
    { userId: 1, type: 1, dateKey: 1 },
    {
      unique: true,
      name: "unique_ai_usage_per_user_type_and_day",
    }
  );

  // 같은 사용자가 같은 종류의 AI 실행을 동시에 시작하지 못하게 합니다.
  await database.collection("aiRuns").createIndex(
    { userId: 1, type: 1 },
    {
      unique: true,
      name: "unique_running_ai_request_per_user_and_type",
      partialFilterExpression: {
        status: "running",
      },
    }
  );

  // 비정상 종료로 남은 AI 실행 잠금은 2분 뒤 자동으로 정리합니다.
  await database.collection("aiRuns").createIndex(
    { expiresAt: 1 },
    {
      expireAfterSeconds: 0,
      name: "expire_old_ai_runs",
    }
  );

  // 정답을 서버에만 보관하는 임시 퀴즈 세션은 1시간 뒤 자동으로 정리합니다.
  await database.collection("quizSessions").createIndex(
    { expiresAt: 1 },
    {
      expireAfterSeconds: 0,
      name: "expire_quiz_sessions",
    }
  );

  await database.collection("quizSessions").createIndex(
    { userId: 1, completedAt: -1 },
    { name: "quiz_notes_by_user_and_completion" }
  );
}

// 이메일로 기존 사용자를 확인하고, 없는 사용자만 Better Auth로 생성합니다.
async function seedTestUsers(auth, database) {
  const userCollection = database.collection("user");
  const userIdsByEmail = new Map();

  // 메모를 연결할 때 사용할 수 있도록 이메일별 사용자 ID를 모읍니다.
  for (const seedUser of seedUsers) {
    const email = seedUser.email.toLowerCase();
    const existingUser = await userCollection.findOne({ email });

    if (existingUser) {
      const existingUserId = existingUser._id?.toString() ?? existingUser.id;

      if (!existingUserId) {
        throw new Error(`${email} 사용자의 ID를 확인하지 못했습니다.`);
      }

      userIdsByEmail.set(email, existingUserId);
      console.log(`[유지] 사용자: ${email}`);
      continue;
    }

    // 사용자를 Better Auth API로 생성해 비밀번호가 평문으로 저장되지 않게 합니다.
    const created = await auth.api.createUser({
      body: {
        name: seedUser.name,
        email,
        password: seedUser.password,
        role: seedUser.role,
      },
    });

    const createdUserId = created?.user?.id;

    if (!createdUserId) {
      throw new Error(`${email} 사용자를 생성했지만 ID를 받지 못했습니다.`);
    }

    userIdsByEmail.set(email, createdUserId);
    console.log(`[추가] 사용자: ${email} (${seedUser.role})`);
  }

  return userIdsByEmail;
}

// slug로 기존 단어를 확인하고, 새 단어 또는 빠진 필수 필드를 저장합니다.
async function seedDictionaryWords(database) {
  const wordCollection = database.collection("words");
  const wordIdsBySlug = new Map();

  // 메모를 연결할 때 사용할 수 있도록 slug별 단어 ID를 모읍니다.
  for (const seedWord of seedWords) {
    const existingWord = await wordCollection.findOne({
      slug: seedWord.slug,
    });

    if (existingWord) {
      wordIdsBySlug.set(seedWord.slug, existingWord._id.toString());

      // 기존 단어의 비어 있는 출처·직역 의미·코드 필드만 채워 다른 값은 보존합니다.
      const missingWordFields = {};

      if (!existingWord.source || ["기존 등록 · 경로 미확인", "초기 데이터"].includes(existingWord.source)) {
        missingWordFields.source = "초기 설정 데이터";
      }

      if (!isValidMeaning(existingWord.meaning)) {
        missingWordFields.meaning = seedWord.meaning;
      }

      if (
        typeof existingWord.codeExample !== "string" ||
        !existingWord.codeExample.trim()
      ) {
        missingWordFields.codeExample = seedWord.codeExample;
      }

      if (!codeLanguages.includes(existingWord.codeLanguage)) {
        missingWordFields.codeLanguage = seedWord.codeLanguage;
      }

      if (Object.keys(missingWordFields).length > 0) {
        await wordCollection.updateOne(
          { _id: existingWord._id },
          {
            $set: {
              ...missingWordFields,
              updatedAt: new Date(),
            },
          }
        );

        console.log(
          `[보충] 단어 필드: ${seedWord.name} (${Object.keys(missingWordFields).join(", ")})`
        );
        continue;
      }

      console.log(`[유지] 단어: ${seedWord.name}`);
      continue;
    }

    const now = new Date();
    const insertResult = await wordCollection.insertOne({
      ...seedWord,
      source: "초기 설정 데이터",
      createdAt: now,
      updatedAt: now,
    });

    wordIdsBySlug.set(seedWord.slug, insertResult.insertedId.toString());
    console.log(`[추가] 단어: ${seedWord.name}`);
  }

  return wordIdsBySlug;
}

// 사용자 ID와 단어 ID를 연결해 아직 존재하지 않는 개인 메모만 저장합니다.
async function seedPersonalMemos(database, userIdsByEmail, wordIdsBySlug) {
  const memoCollection = database.collection("memos");

  for (const seedMemo of seedMemos) {
    const userId = userIdsByEmail.get(seedMemo.userEmail);
    const wordId = wordIdsBySlug.get(seedMemo.wordSlug);

    if (!userId || !wordId) {
      throw new Error(
        `${seedMemo.userEmail}의 ${seedMemo.wordSlug} 메모 연결 정보를 찾지 못했습니다.`
      );
    }

    const existingMemo = await memoCollection.findOne({
      userId,
      wordId,
    });

    if (existingMemo) {
      console.log(
        `[유지] 개인 메모: ${seedMemo.userEmail} / ${seedMemo.wordSlug}`
      );
      continue;
    }

    const now = new Date();

    await memoCollection.insertOne({
      userId,
      wordId,
      content: seedMemo.content,
      createdAt: now,
      updatedAt: now,
    });

    console.log(
      `[추가] 개인 메모: ${seedMemo.userEmail} / ${seedMemo.wordSlug}`
    );
  }
}

// --dry-run 실행 시 DB를 변경하지 않고 초기 데이터 검사 결과만 출력합니다.
function printDryRunResult() {
  console.log("Seed 데이터 검증을 통과했습니다.");
  console.log(`카테고리: ${categories.length}개`);

  for (const category of categories) {
    const wordCount = seedWords.filter(
      (word) => word.category === category
    ).length;

    console.log(`- ${category}: ${wordCount}개`);
  }

  console.log(`테스트 사용자: ${seedUsers.length}명`);
  console.log(`개인 메모: ${seedMemos.length}개`);
  console.log("직역 의미: 모든 단어에 포함");
  console.log(`코드 언어: ${codeLanguages.join(", ")}`);
  console.log("--dry-run에서는 MongoDB 데이터를 변경하지 않았습니다.");
}

// 환경 변수 확인부터 DB 연결과 데이터 저장까지 전체 Seed 순서를 실행합니다.
async function runSeed() {
  // 먼저 환경 변수를 불러오고 코드에 작성한 초기 데이터가 올바른지 검사합니다.
  loadLocalEnvironmentVariables();
  validateSeedData();

  // --dry-run 옵션이 있으면 검사 결과만 출력하고 DB 연결 전에 종료합니다.
  const isDryRun = process.argv.includes("--dry-run");

  if (isDryRun) {
    printDryRunResult();
    return;
  }

  // MongoDB와 Better Auth 설정에 사용할 환경 변수와 기본값을 준비합니다.
  const mongoUri = process.env.MONGODB_URI;
  const mongoDatabaseName = process.env.MONGODB_DB_NAME || "dev-words";
  const betterAuthSecret = process.env.BETTER_AUTH_SECRET;

  if (!mongoUri) {
    throw new Error("MONGODB_URI 환경 변수가 필요합니다.");
  }

  if (!betterAuthSecret || betterAuthSecret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET은 32자 이상이어야 합니다.");
  }

  // 환경 변수의 주소를 사용해 MongoDB 클라이언트를 준비합니다.
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();

    // Seed 사용자도 서비스와 같은 인증 규칙을 사용하도록 Better Auth를 설정합니다.
    const database = client.db(mongoDatabaseName);
    const auth = betterAuth({
      secret: betterAuthSecret,
      baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
      database: mongodbAdapter(database, {
        transaction: false,
      }),
      emailAndPassword: {
        enabled: true,
        minPasswordLength: 4,
        autoSignIn: false,
      },
      plugins: [
        adminPlugin({
          defaultRole: "user",
          adminRoles: ["admin"],
        }),
      ],
    });

    console.log(`MongoDB 연결 완료: ${mongoDatabaseName}`);

    // 데이터를 넣기 전에 중복 방지 인덱스를 먼저 준비합니다.
    await createIndexes(database);
    if (process.argv.includes("--indexes-only")) {
      console.log("인덱스 준비 완료. 초기 데이터는 추가하지 않았습니다.");
      return;
    }

    if (process.argv.includes("--sources-only")) {
      const result = await database.collection("words").updateMany(
        {
          slug: { $in: seedWords.map((word) => word.slug) },
          $or: [{ source: { $exists: false } }, { source: null }, { source: "" }, { source: "기존 등록 · 경로 미확인" }, { source: "초기 데이터" }],
        },
        { $set: { source: "초기 설정 데이터" } }
      );
      console.log(`초기 설정 데이터 출처 갱신: ${result.modifiedCount}개`);
      return;
    }

    // 사용자, 단어, 메모 순서로 저장해 메모에 필요한 두 ID를 연결합니다.
    const userIdsByEmail = await seedTestUsers(auth, database);
    const wordIdsBySlug = await seedDictionaryWords(database);

    await seedPersonalMemos(database, userIdsByEmail, wordIdsBySlug);

    console.log("초기 데이터 저장을 완료했습니다.");
  } finally {
    // 실행 성공 여부와 관계없이 MongoDB 연결을 닫아 프로세스가 남지 않게 합니다.
    await client.close();
  }
}

// Seed 실행 중 오류가 생기면 원인을 출력하고 실패 종료 코드를 설정합니다.
try {
  await runSeed();
} catch (error) {
  console.error("Seed 실행 실패:", error.message);
  process.exitCode = 1;
}
