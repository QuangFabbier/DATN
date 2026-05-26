import { useNavigate } from 'react-router-dom'

function AIConsultantWidget() {
  const navigate = useNavigate()

  return (
    <div className="ai-widget ai-widget-shortcut">
      <button
        type="button"
        className="ai-widget-fab"
        onClick={() => navigate('/ai-consultant')}
        aria-label="Mở AI Consultant toàn màn hình"
      >
        AI
      </button>
    </div>
  )
}

export default AIConsultantWidget
