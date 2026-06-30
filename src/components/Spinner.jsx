export default function Spinner({ size = 28 }) {
  return (
    <div className="spinner" style={{
      width: size, height: size, margin: '0 auto',
      borderColor: 'rgba(13,31,53,.08)', borderTopColor: '#0D1F35',
    }} />
  )
}
