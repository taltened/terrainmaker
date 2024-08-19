import { ChangeEvent, ReactElement, useCallback } from 'react';
import '../icons/eye.css';
import '../icons/pen.css';
import styles from './IconCheckbox.module.css';
import { Theme } from '../themes/theme';

export type IconName =
| 'eye'
| 'pen'
;

export interface IconCheckboxProps {
  readonly theme: Theme;
  readonly icon: IconName;
  readonly text?: string;
  readonly checked?: boolean;
  readonly onChange?: (checked: boolean) => void;
}

export function IconCheckbox({
  theme,
  icon,
  text,
  checked,
  onChange,
}: IconCheckboxProps): ReactElement {
  const onCheck = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event.target.checked)
  }, [onChange]);
  return (
    <label className={`${styles.root} ${theme.link} ${checked ? theme['link-checked']: ''}`}>
      <input type="checkbox" checked={checked} onChange={onCheck} />
      <i className={`gg-${icon}`}/>
      {text && <span>{text}</span>}
    </label>
  );
}
