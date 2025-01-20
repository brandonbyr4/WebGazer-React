import React, { useEffect, useRef, useState } from "react";

const EyeTracker = () => {
  const canvasRef = useRef(null);
  const [currentlyTracking, setCurrentlyTracking] = useState(true);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState({});

  useEffect(() => {
    const initializeWebGazer = async () => {
      await webgazer
        .setRegression("ridge")
        .setGazeListener((data, clock) => {
          // console.log(data);
          // console.log(clock);
        })
        .saveDataAcrossSessions(false)
        .begin();

      webgazer
        .showVideoPreview(false)
        .showPredictionPoints(true)
        .applyKalmanFilter(true);

      setupCanvas();
    };

    const setupCanvas = () => {
      const canvas = canvasRef.current;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.style.position = "fixed";
    };

    initializeWebGazer();

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const clearCanvas = () => {
    document.querySelectorAll(".Calibration").forEach((i) => {
      i.style.display = "none";
    });
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const popupInstruction = () => {
    clearCanvas();
    alert(
      "Please click on each of the 9 points on the screen. You must click on each point 5 times till it goes green. This will calibrate your eye movements."
    );
    showCalibrationPoints();
  };

  const calculateAccuracy = () => {
    const centerPoint = document.getElementById('Pt5');
    centerPoint.style.display = 'block';

    alert(
      "Please don't move your mouse & stare at the middle dot for the next 5 seconds. This will allow us to calculate the accuracy of our predictions."
    );

    storePointsVariable();

    sleep(5000).then(() => {
      stopStoringPointsVariable();
      const past50 = webgazer.getStoredPoints();
      const precisionMeasurement = calculatePrecision(past50);

      clearCanvas();
      centerPoint.style.display = 'none';
      setCalibrationPoints({});
      
      alert("Calibration successful! Accuracy: " + precisionMeasurement + "%");
    });
  };

  const handleCalibrationClick = (id) => {
    setCalibrationPoints((prevPoints) => {
      const newPoints = { ...prevPoints, [id]: (prevPoints[id] || 0) + 1 };
      const newCalibrate = Object.values(newPoints).filter((count) => count >= 5).length;

      if (newPoints[id] === 5) {
        document.getElementById(id).style.backgroundColor = "#22c55e";
        document.getElementById(id).setAttribute("disabled", "disabled");
      } else {
        const opacity = 0.2 * newPoints[id] + 0.2;
        document.getElementById(id).style.opacity = opacity;
      }

      if (newCalibrate === 8) {
        document.getElementById("Pt5").style.display = "block";
      }

      if (newCalibrate >= 9) {
        document.querySelectorAll(".Calibration").forEach((i) => {
          i.style.display = "none";
        });
        calculateAccuracy();
      }

      return newPoints;
    });
  };

  const showCalibrationPoints = () => {
    setCalibrating(true);

    document.querySelectorAll(".Calibration").forEach((i) => {
      i.style.display = "block";
    });
    document.getElementById("Pt5").style.display = "none";
  };

  const clearCalibration = () => {
    document.querySelectorAll(".Calibration").forEach((i) => {
      i.style.backgroundColor = "#06b6d4";
      i.style.opacity = "0.2";
      i.removeAttribute("disabled");
    });
  };

  const restart = () => {
    webgazer.clearData();
    clearCalibration();
    popupInstruction();
  };

  const storePointsVariable = () => {
    webgazer.params.storingPoints = true;
  };

  const stopStoringPointsVariable = () => {
    webgazer.params.storingPoints = false;
  };

  const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));

  const calculatePrecision = (past50Array) => {
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    const x50 = past50Array[0];
    const y50 = past50Array[1];

    const staringPointX = windowWidth / 2;
    const staringPointY = windowHeight / 2;

    const precisionPercentages = new Array(50);
    for (let x = 0; x < 50; x++) {
      const xDiff = staringPointX - x50[x];
      const yDiff = staringPointY - y50[x];
      const distance = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
      const halfWindowHeight = windowHeight / 2;
      precisionPercentages[x] =
        distance <= halfWindowHeight
          ? 100 - (distance / halfWindowHeight) * 100
          : 0;
    }

    return Math.round(
      precisionPercentages.reduce((sum, val) => sum + val, 0) / 50
    );
  };

  return (
    <div>
      <canvas id="plotting_canvas" ref={canvasRef}></canvas>
      {currentlyTracking && <button
        onClick={restart}
        className="
          fixed
          top-2
          left-2
          py-2
          px-4
          text-white
          bg-blue-500
          hover:bg-sky-500
          rounded-full
          transition
          z-[100]
        "
      >
        Calibrate
      </button>}
      {currentlyTracking === false ?
        <button
          onClick={() => {
            webgazer.begin()
            webgazer.showVideo(true)

            setCurrentlyTracking(true)
          }}
          className="
            fixed
            top-2
            right-2
            py-2
            px-4
            text-white
            bg-blue-500
            hover:bg-sky-500
            rounded-full
            transition
            z-[100]
          "
        >
          Start tracking
        </button> : 
        <button
          onClick={() => {
            webgazer.end()
            webgazer.stopVideo()

            setCurrentlyTracking(false)
          }}
          className="
            fixed
            top-2
            right-2
            py-2
            px-4
            text-white
            bg-red-500
            hover:bg-pink-500
            rounded-full
            transition
            z-[100]
          "
        >
          Stop tracking
        </button>
      }
      <div className="calibrationDiv">
        {Array.from({ length: 9 }).map((_, index) => (
          <button
            key={index + 1}
            className="
              Calibration
              hidden
              bg-blue-500
              text-white
              font-semibold
              py-2
              px-4
              rounded-lg
              fixed
              z-50
              shadow-lg
              hover:bg-blue-600
              transition
              duration-200
            "
            id={`Pt${index + 1}`}
            onClick={() => handleCalibrationClick(`Pt${index + 1}`)}
          ></button>
        ))}
      </div>
    </div>
  );
};

export default EyeTracker;
