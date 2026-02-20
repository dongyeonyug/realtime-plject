

**Socket.io와 Redis를 활용한 실시간 동시 편집 플랫폼**

데이터의 무결성과 서버 부하 감소를 위해 **Caching Strategy**를 적용했습니다.

* **Read/Write Flow**: 모든 편집 데이터는 **Redis**에 우선 저장 된 후 **MySQL**로 동기화됩니다. 조회 시에도 Redis를 먼저 참조하여 DB 부하를 최소화합니다.
* **Real-time**: **Socket.io**를 통해 다수 사용자의 편집 상태를 실시간 동기화합니다.
* **Auth**: **JWT** 인증 방식을 사용하며, 로그아웃 시 토큰을 Redis **Blacklist**에 등록하여 보안을 강화했습니다.

## Stack

* **Frontend**: React (Vite), Socket.io-client
* **Backend**: Node.js (Express), Socket.io
* **Database**: Redis, MySQL
* **Auth**: JWT (JSON Web Token)

## Key Features

* **실시간 동시 편집**: 여러 유저가 동시에 문서 수정 가능
* **3단계 권한 제어**:
1. **나만 보기** (Private)
2. **보기 가능** (ReadOnly)
3. **편집 및 보기 가능** (Full Access)

* **세션 관리**: Redis를 활용한 효율적인 토큰 만료 및 로그아웃 처리
