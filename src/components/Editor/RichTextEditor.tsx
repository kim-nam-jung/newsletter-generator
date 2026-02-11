import React, { useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import './Editor.css';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const Font = ReactQuill.Quill.import('formats/font');
// Whitelist of fonts
Font.whitelist = [
  'malgun-gothic', 
  'gulim', 
  'dotum', 
  'nanum-gothic', 
  'noto-sans-kr',
  'sans-serif', 
  'serif', 
  'monospace'
];
ReactQuill.Quill.register(Font, true);

const CustomToolbar = ({ id }: { id: string }) => (
  <div id={id}>
    <span className="ql-formats">
      <select className="ql-header" defaultValue="" title="문단 형식">
        <option value="1">제목 1</option>
        <option value="2">제목 2</option>
        <option value="">본문</option>
      </select>
      <select className="ql-font" defaultValue="malgun-gothic" title="글꼴">
        <option value="malgun-gothic">맑은 고딕</option>
        <option value="gulim">굴림</option>
        <option value="dotum">돋움</option>
        <option value="nanum-gothic">나눔고딕</option>
        <option value="noto-sans-kr">Noto Sans KR</option>
        <option value="sans-serif">Sans Serif</option>
        <option value="serif">Serif</option>
        <option value="monospace">Monospace</option>
      </select>
    </span>
    <span className="ql-formats">
      <button className="ql-bold" title="굵게 (Ctrl+B)" />
      <button className="ql-italic" title="기울임 (Ctrl+I)" />
      <button className="ql-underline" title="밑줄 (Ctrl+U)" />
      <button className="ql-strike" title="취소선" />
      <button className="ql-blockquote" title="인용구" />
    </span>
    <span className="ql-formats">
      <button className="ql-list" value="ordered" title="번호 매기기" />
      <button className="ql-list" value="bullet" title="글머리 기호" />
      <button className="ql-indent" value="-1" title="내어쓰기" />
      <button className="ql-indent" value="+1" title="들여쓰기" />
    </span>
    <span className="ql-formats">
      <select className="ql-color" title="글자 색상" />
      <select className="ql-background" title="배경 색상" />
    </span>
    <span className="ql-formats">
      <select className="ql-align" title="정렬" />
    </span>
    <span className="ql-formats">
      <button className="ql-link" title="링크 삽입" />
      <button className="ql-image" title="이미지 삽입" />
    </span>
    <span className="ql-formats">
      <button className="ql-clean" title="서식 지우기" />
    </span>
  </div>
);

const formats = [
  'header', 'font',
  'bold', 'italic', 'underline', 'strike', 'blockquote',
  'list', 'indent',
  'link', 'image',
  'color', 'background',
  'align'
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange }) => {
  // Generate unique ID for this editor's toolbar
  const toolbarId = useMemo(() => `toolbar-${Math.random().toString(36).substring(2, 9)}`, []);

  const modules = useMemo(() => ({
    toolbar: {
      container: `#${toolbarId}`,
    },
  }), [toolbarId]);

  return (
    <div className="rich-text-editor">
      <CustomToolbar id={toolbarId} />
      <ReactQuill 
        theme="snow"
        value={content}
        onChange={onChange}
        modules={modules}
        formats={formats}
      />
    </div>
  );
};
