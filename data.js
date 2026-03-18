// ============================================================
// Firebase 설정 - 아래 값을 Firebase 콘솔에서 복사해서 넣으세요
// ============================================================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBNeY0Drg5lGNY3MNeAT9ArHl6J5uMxz48",
  authDomain: "math-f8935.firebaseapp.com",
  projectId: "math-f8935",
  storageBucket: "math-f8935.firebasestorage.app",
  messagingSenderId: "483588209738",
  appId: "1:483588209738:web:c1d27e8382bca1ce1abab3",
  measurementId: "G-X3K9K4ZLHK"
};

// ============================================================
// 학생 정보
// ============================================================
const STUDENTS = {
  kimsiying: {
    name: '김시영',
    school: '죽전고 1학년',
    books: ['rpm_common1', 'ssen_common1']
  },
  umtaehyun: {
    name: '엄태현',
    school: '대지중 1학년',
    books: ['rpm_mid1_1', 'gaenym_mid1_1', 'gaenym_mid1_2']
  }
};

// ============================================================
// 문제집 목차
// ============================================================
const BOOKS = {
  rpm_mid1_1: {
    name: 'RPM 중1-1',
    chapters: [
      {
        id: 'I', name: 'Ⅰ. 소인수분해',
        sections: [
          { id: 'I-1', name: '1. 소인수분해' },
          { id: 'I-2', name: '2. 최대공약수와 최소공배수' }
        ]
      },
      {
        id: 'II', name: 'Ⅱ. 정수와 유리수',
        sections: [
          { id: 'II-1', name: '1. 정수와 유리수' },
          { id: 'II-2', name: '2. 정수와 유리수의 계산' }
        ]
      },
      {
        id: 'III', name: 'Ⅲ. 문자와 식',
        sections: [
          { id: 'III-1', name: '1. 문자의 사용과 식의 계산' },
          { id: 'III-2', name: '2. 일차방정식의 풀이' },
          { id: 'III-3', name: '3. 일차방정식의 활용' }
        ]
      },
      {
        id: 'IV', name: 'Ⅳ. 좌표평면과 그래프',
        sections: [
          { id: 'IV-1', name: '1. 좌표와 그래프' },
          { id: 'IV-2', name: '2. 정비례와 반비례' }
        ]
      }
    ]
  },

  gaenym_mid1_1: {
    name: '개념쎈 중1-1',
    chapters: [
      {
        id: 'I', name: 'Ⅰ. 수와 연산',
        sections: [
          { id: 'I-1', name: '1. 소인수분해' },
          { id: 'I-2', name: '2. 정수와 유리수' },
          { id: 'I-3', name: '3. 유리수의 계산' }
        ]
      },
      {
        id: 'II', name: 'Ⅱ. 방정식',
        sections: [
          { id: 'II-1', name: '1. 문자의 사용과 식' },
          { id: 'II-2', name: '2. 일차방정식의 풀이' },
          { id: 'II-3', name: '3. 일차방정식의 활용' }
        ]
      },
      {
        id: 'III', name: 'Ⅲ. 그래프와 비례',
        sections: [
          { id: 'III-1', name: '1. 좌표평면과 그래프' },
          { id: 'III-2', name: '2. 정비례와 반비례' }
        ]
      }
    ]
  },

  gaenym_mid1_2: {
    name: '개념쎈 중1-2',
    chapters: [
      {
        id: 'I', name: 'Ⅰ. 기본 도형',
        sections: [
          { id: 'I-1', name: '1. 기본 도형' },
          { id: 'I-2', name: '2. 위치 관계' },
          { id: 'I-3', name: '3. 작도와 합동' }
        ]
      },
      {
        id: 'II', name: 'Ⅱ. 평면도형',
        sections: [
          { id: 'II-1', name: '1. 다각형' },
          { id: 'II-2', name: '2. 원과 부채꼴' }
        ]
      },
      {
        id: 'III', name: 'Ⅲ. 입체도형',
        sections: [
          { id: 'III-1', name: '1. 다면체와 회전체' },
          { id: 'III-2', name: '2. 입체도형의 겉넓이와 부피' }
        ]
      },
      {
        id: 'IV', name: 'Ⅳ. 통계',
        sections: [
          { id: 'IV-1', name: '1. 자료의 정리와 해석' }
        ]
      }
    ]
  },

  rpm_common1: {
    name: 'RPM 공통수학1',
    chapters: [
      {
        id: 'I', name: 'Ⅰ. 다항식',
        sections: [
          { id: 'I-1', name: '1. 다항식의 연산' },
          { id: 'I-2', name: '2. 항등식과 나머지정리' },
          { id: 'I-3', name: '3. 인수분해' }
        ]
      },
      {
        id: 'II', name: 'Ⅱ. 방정식과 부등식',
        sections: [
          { id: 'II-1', name: '1. 복소수' },
          { id: 'II-2', name: '2. 이차방정식' },
          { id: 'II-3', name: '3. 이차방정식과 이차함수' },
          { id: 'II-4', name: '4. 여러 가지 방정식' },
          { id: 'II-5', name: '5. 여러 가지 부등식' }
        ]
      },
      {
        id: 'III', name: 'Ⅲ. 경우의 수',
        sections: [
          { id: 'III-1', name: '1. 경우의 수와 순열' },
          { id: 'III-2', name: '2. 조합' }
        ]
      },
      {
        id: 'IV', name: 'Ⅳ. 행렬',
        sections: [
          { id: 'IV-1', name: '1. 행렬' }
        ]
      }
    ]
  },

  ssen_common1: {
    name: '쎈 공통수학1',
    chapters: [
      {
        id: 'I', name: 'Ⅰ. 다항식',
        sections: [
          { id: 'I-1', name: '01. 다항식의 연산' },
          { id: 'I-2', name: '02. 나머지 정리와 인수분해' }
        ]
      },
      {
        id: 'II', name: 'Ⅱ. 방정식',
        sections: [
          { id: 'II-1', name: '03. 복소수' },
          { id: 'II-2', name: '04. 이차방정식' },
          { id: 'II-3', name: '05. 이차방정식과 이차함수' },
          { id: 'II-4', name: '06. 여러 가지 방정식' }
        ]
      },
      {
        id: 'III', name: 'Ⅲ. 부등식',
        sections: [
          { id: 'III-1', name: '07. 일차부등식' },
          { id: 'III-2', name: '08. 이차부등식' }
        ]
      },
      {
        id: 'IV', name: 'Ⅳ. 순열과 조합',
        sections: [
          { id: 'IV-1', name: '09. 순열과 조합' }
        ]
      },
      {
        id: 'V', name: 'Ⅴ. 행렬',
        sections: [
          { id: 'V-1', name: '10. 행렬과 그 연산' }
        ]
      }
    ]
  }
};
