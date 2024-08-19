import { ChangeEvent, ReactElement, useCallback } from 'react';

export interface FileInputProps {
  readonly label: string;
  readonly setValue?: (value: string) => void;
}

export function FileInput({
  label,
  setValue,
}: FileInputProps): ReactElement {
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setValue?.(event.target.files?.[0]?.path ?? '');
    },
    [setValue],
  );
  return (
    <label>
      {label}
      <input type="file" onChange={onChange} />
    </label>
  );
}
