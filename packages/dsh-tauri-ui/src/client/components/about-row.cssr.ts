import { styles as sharedStyles } from '../theme'
import { cssr } from '../utils/cssr'

const { c, bem: { b, e } } = cssr
const { primary, secondary, brand, borderL2 } = sharedStyles

/** 通用设置底部：应用版本号 + 致谢来源项目。 */
export default b('about-row', {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '16px 0',
  borderBottom: `0.5px solid ${borderL2}`,
}, [
  e('head', {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }),
  e('title', {
    flex: 1,
    minWidth: 0,
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: '22px',
    color: primary,
  }),
  e('value', {
    flex: 'none',
    fontSize: '14px',
    lineHeight: '22px',
    fontVariantNumeric: 'tabular-nums',
    color: secondary,
  }),
  e('thanks', {
    fontSize: '12px',
    lineHeight: '18px',
    color: secondary,
  }),
  e('link', {
    display: 'inline',
    margin: 0,
    padding: 0,
    border: 'none',
    background: 'none',
    font: 'inherit',
    color: brand,
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  }, [
    c('&:hover', { opacity: 0.82 }),
  ]),
])
