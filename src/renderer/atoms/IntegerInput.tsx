import { ChangeEvent, ReactElement, useCallback } from 'react';

export interface IntegerInputProps {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly value: number;
  readonly setValue?: (value: number) => void;
}

export function IntegerInput({ label, min, max, value, setValue }: IntegerInputProps): ReactElement {
  const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setValue?.(parseInt(event.target.value, 10));
  }, [setValue]);
  return (
    <label>
      {label}
      <input type="number" min={min} max={max} value={value} onChange={onChange} />
    </label>
  );
}
