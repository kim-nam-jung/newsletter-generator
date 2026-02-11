declare module 'uuid' {
  export function v4(): string;
}

declare module 'react-quill' {
  import React from 'react';
  export interface ReactQuillProps {
    theme?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modules?: any;
    formats?: string[];
    value?: string;
    onChange?: (content: string) => void;
  }
  export default class ReactQuill extends React.Component<ReactQuillProps> {}
}
