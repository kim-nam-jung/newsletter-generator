# 뉴스레터 생성기 (Newsletter Generator)

드래그 앤 드롭 에디터와 PDF-이미지 변환 기능을 제공하는 뉴스레터 제작 도구입니다. 복잡한 설정 없이 직관적으로 이메일 뉴스레터를 만들고 HTML로 내보낼 수 있습니다.

## 주요 기능 (Features)

- **드래그 앤 드롭 에디터**: 텍스트와 이미지 블록을 쉽고 자유롭게 배치하세요.
- **PDF 이미지 변환**: PDF 파일을 업로드하면 자동으로 고화질 이미지로 변환되며, 원본 링크가 그대로 유지됩니다 (오버레이 기능).
- **미니멀 UI**: 작업에 집중할 수 있는 깔끔하고 심플한 디자인.
- **HTML 내보내기**: 완성된 뉴스레터를 바로 발송 가능한 HTML 파일로 다운로드합니다.

## 설치 방법 (Installation)

1.  **Node.js 설치**: [nodejs.org](https://nodejs.org/)에서 최신 버전을 다운로드하여 설치합니다.
2.  **저장소 복제 (Clone)**:
    ```bash
    git clone https://github.com/kim-nam-jung/newsletter-generator.git
    cd newsletter-generator
    ```
3.  **간편 설치 (Windows)**:
    - 폴더 내의 `setup.bat` 파일을 더블 클릭하세요.
    - 자동으로 필요한 패키지를 설치하고 프로그램을 실행합니다.

    *수동 설치*:
    ```bash
    npm install
    npm run dev
    ```

## 사용 방법 (Usage)

1.  브라우저에서 `http://localhost:5173` 주소로 접속합니다.
2.  **"New Newsletter"** 버튼을 눌러 새 작업을 시작합니다.
3.  **Editor** 패널에서 텍스트나 이미지 블록을 추가하여 내용을 구성합니다.
4.  PDF 파일을 업로드하면 자동으로 이미지가 잘려서 삽입됩니다.
5.  작업이 끝나면 **"Export"** 버튼을 눌러 HTML 파일을 다운로드하세요.

## 기술 스택 (Technologies)

- React (Vite)
- Node.js (Express)
- TypeScript
- PDF.js / Canvas
