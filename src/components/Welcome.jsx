import welcomeBackground from '../../รูป/รูปเริ่มต้น.jpg';
import logo from '../../รูป/โลโก้.png';
import './Welcome.css';

export default function Welcome({ onStart }) {
  return (
    <main className="welcome">
      <div 
        className="welcome-bg" 
        style={{ backgroundImage: `url("${welcomeBackground}")` }} 
        aria-hidden="true" 
      />
      <div className="welcome-content">
        <img className="welcome-logo" src={logo} alt="โลโก้ Klay Klaai" />
        {/* From Uiverse.io by tirth_5172 */}
        <button className="welcome-start" type="button" onClick={onStart}>
          <span className="welcome-start-label">คลิกเพื่อเริ่มต้น</span>
          <span className="welcome-start-shine" aria-hidden="true" />
          <span className="welcome-start-edge edge-top-left" aria-hidden="true" />
          <span className="welcome-start-edge edge-top-right" aria-hidden="true" />
          <span className="welcome-start-edge edge-bottom-left" aria-hidden="true" />
          <span className="welcome-start-edge edge-bottom-right" aria-hidden="true" />
        </button>
      </div>
    </main>
  );
}
