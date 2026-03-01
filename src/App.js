import PixelAnimator from "./PixelAnimator";
import cake1 from "./assets/cake1.png";
import cake2 from "./assets/cake2.png";
import cake3 from "./assets/cake3.png";
import cake100 from "./assets/100.png";
import cake80 from "./assets/80.png";
import cake60 from "./assets/60.png";
import cake40 from "./assets/40.png";
import cake20 from "./assets/20.png";
import birthdayText from "./assets/birthdaytext.png";
import "./App.css";
import Confetti from "./Confetti";
import { useEffect, useRef, useState, useCallback } from "react";
import birthdaySong from "./assets/bdayaudo.mp3";

export default function App() {
  const audioRef = useRef(null);
  const [staticFrame, setStaticFrame] = useState(null);

  const micStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const gainNodeRef = useRef(null);
  const rafRef = useRef(null);

  const [celebrating, setCelebrating] = useState(false);
  const [showMatthew, setShowMatthew] = useState(false);

  let matthewSrc = null;
  try {
    matthewSrc = require("./assets/matthew.jpg");
  } catch (e) {
    matthewSrc = null;
  }

  useEffect(() => {
    const playAudio = async () => {
      try {
        await audioRef.current.play();
      } catch (err) {
        console.log("Autoplay blocked:", err);
      }
    };
    playAudio();
  }, []);

  // Wrap startMicMonitoring in useCallback for stable reference
  const startMicMonitoring = useCallback(async () => {
    if (micStreamRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 3.0;
      gainNodeRef.current = gainNode;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      source.connect(gainNode);
      gainNode.connect(analyser);

      const data = new Float32Array(analyser.fftSize);

      const pickStaticFrame = (rms) => {
        if (rms < 0.02) return null;
        if (rms >= 0.30) return cake20;
        if (rms >= 0.22) return cake40;
        if (rms >= 0.15) return cake60;
        if (rms >= 0.08) return cake80;
        return cake100;
      };

      const loop = () => {
        analyser.getFloatTimeDomainData(data);

        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          sum += data[i] * data[i];
        }

        const rms = Math.sqrt(sum / data.length);
        const chosen = pickStaticFrame(rms);

        setStaticFrame((prev) => (prev === chosen ? prev : chosen));
        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      console.warn("Mic access failed:", err);
    }
  }, []);

  useEffect(() => {
    startMicMonitoring();
    return () => stopMicMonitoring();
  }, [startMicMonitoring]); // ✅ stable dependency

  const stopMicMonitoring = (reset = true) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (audioCtxRef.current) audioCtxRef.current.close();
    if (micStreamRef.current)
      micStreamRef.current.getTracks().forEach((t) => t.stop());

    rafRef.current = null;
    analyserRef.current = null;
    audioCtxRef.current = null;
    micStreamRef.current = null;

    if (reset) setStaticFrame(null);
  };

  const handleCakeClick = () => {
    audioRef.current.play();
  };

  useEffect(() => {
    if (staticFrame === cake20) {
      stopMicMonitoring(false);
      setCelebrating(true);
    }
  }, [staticFrame]);

  return (
    <div className="App">
      <audio ref={audioRef} src={birthdaySong} loop />
      <img
        src={birthdayText}
        alt="Happy Birthday"
        className="birthdayText"
        draggable={false}
      />

      <div className="cakeLoop">
        <PixelAnimator
          className="cake"
          frames={staticFrame ? [staticFrame] : [cake1, cake2, cake3]}
          fps={3}
          scale={4}
          mode="img"
          onClick={handleCakeClick}
        />
      </div>

      {celebrating && (
        <Confetti
          pieces={60}
          duration={8000}
          onDone={() => {
            setCelebrating(false);
            setTimeout(() => setShowMatthew(true), 300);
          }}
        />
      )}

      {showMatthew && (
        <div
          className="matthew-overlay"
          onClick={() => setShowMatthew(false)}
        >
          <div className="matthew-card">
            {matthewSrc ? (
              <img src={matthewSrc} alt="Matthew" />
            ) : (
              <div className="fallback-text">Matthew</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}