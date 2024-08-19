import { ReactElement } from 'react';
import '../icons/add.css';
import '../icons/trash.css';
import styles from './IconButton.module.css';

export type IconName =
| 'add'
| 'trash'
;

export interface IconButtonProps {
  readonly icon: IconName;
  readonly text?: string;
  readonly onClick?: () => void;
}

export function IconButton({ icon, text, onClick }: IconButtonProps): ReactElement {
  return (
    <button type="button" onClick={onClick} className={styles.root}>
      <i className={`gg-${icon}`} />
      {text && <span>{text}</span>}
    </button>
  );
}
