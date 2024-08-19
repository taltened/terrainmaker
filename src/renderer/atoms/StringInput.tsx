import { ChangeEvent, ReactElement, useCallback } from 'react';

export interface StringInputProps {
  readonly className?: string;
  readonly label: string;
  readonly value: string;
  readonly setValue?: (value: string) => void;
}

export function StringInput({
  className,
  label,
  value,
  setValue,
}: StringInputProps): ReactElement {
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setValue?.(event.target.value);
    },
    [setValue],
  );
  return (
    <label className={className}>
      {label}
      <input
        style={{width: '100%', boxSizing: 'border-box'}}
        type="text"
        value={value}
        onChange={onChange}
      />
    </label>
  );
}
