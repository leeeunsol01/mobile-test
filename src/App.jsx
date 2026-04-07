import { useState, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import gsap from 'gsap';
import * as THREE from 'three';

function XrModel({ controlsRef, setSelectedName, selectedMesh, setSelectedMesh, setHiddenMesh, groupRef, isHideMode, hiddenMesh }) {
  const { scene } = useGLTF(import.meta.env.BASE_URL + 'xr_anatomy.glb');
  const { camera } = useThree();

  const isDraggng = useRef(false);
  const prevMouse = useRef([0, 0]);
  const prevTouch = useRef([0, 0]);
  const lastDistance = useRef(null);
  const touchMode = useRef(null);

  const getDistance = ([t1, t2]) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.hypot(dx, dy);
  } 

  useEffect(() => {
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        touchMode.current = 'rotate'; // 🔥 추가
        const touch = e.touches[0];
        prevTouch.current = [touch.clientX, touch.clientY];
      }

      if (e.touches.length === 2) {
        touchMode.current = 'zoom'; // 🔥 추가
        lastDistance.current = getDistance(e.touches);
      }
    };

    const onTouchMove = (e) => {
      if(!groupRef.current) return;

      if(touchMode.current === 'rotate' && e.touches.length === 1){
        const touch = e.touches[0];

        const dx = touch.clientX - prevTouch.current[0];
        const dy = touch.clientY - prevTouch.current[1];

        prevTouch.current = [touch.clientX, touch.clientY];

        groupRef.current.rotation.y += dx * 0.005;
        // groupRef.current.rotation.x += dy * 0.005;
        const newX = groupRef.current.rotation.x + dy * 0.005;
        const max = Math.PI / 3;
        const min = -Math.PI / 3;

        groupRef.current.rotation.x = Math.max(min, Math.min(max, newX));

        controlsRef.current.update();
      }

      if(touchMode.current === 'zoom' && e.touches.length === 2){
        const distance = getDistance(e.touches);

        if(lastDistance.current !== null){
          const delta = distance - lastDistance.current;

          const minDistance = 2;
          const maxDistance = 10;

          const directionToTarget = camera.position
          .clone().sub(new THREE.Vector3(0, 0, 0));
          const currentDistance = directionToTarget.length();

          const newDistance = THREE.MathUtils.clamp(
            currentDistance - delta * 0.005,
            minDistance,
            maxDistance
          );

          directionToTarget.normalize().multiplyScalar(newDistance);
          camera.position.copy(directionToTarget);
          camera.lookAt(0, 0, 0);
          controlsRef.current.update();
          // camera.position.z -= delta * 0.01;
          // const direction = new THREE.Vector3();
          // camera.getWorldDirection(direction);
          // direction.multiplyScalar(-1);

          // const move = direction.clone().multiplyScalar(-delta * 0.01);
          // // 카메라 이동
          // camera.position.add(move);
          // // camera.position.clampLength(2, 10);
          // // controlsRef.current.target.clampLength(0, 5);
          // // target도 같이 이동
          // // controlsRef.current.target.add(move);
          // controlsRef.current.update();
        }
        lastDistance.current = distance;
      }
    };
    const onTouchEnd = () => {
      touchMode.current = null;
      lastDistance.current = null;
    };
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // 모델 회전
  useEffect(() => {
    const onPointerDown = (e) => {
      if(e.button !== 0) return;

      isDraggng.current = true;
      prevMouse.current = [e.clientX, e.clientY];
    };

    const onPointerUp = (e) => {
      isDraggng.current = false;
    };

    const onPointerMove = (e) => {
      if(!isDraggng.current) return;
      // if(!groupRef.current) return;
      if((e.button & 1) !== 1) return;

      const dx = e.clientX - prevMouse.current[0];
      const dy = e.clientY - prevMouse.current[1];

      prevMouse.current = [e.clientX, e.clientY];

      // 마우스 드래그해서 회전시키는 기능
      groupRef.current.rotation.y += dx * 0.005;
      groupRef.current.rotation.x += dy * 0.005;
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);

    return() => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  // 위치값 저장
  const initialCameraPos = useRef(new THREE.Vector3());
  const initialTarget = useRef(new THREE.Vector3());

  // ✅ 초기 카메라 저장 (타이밍 안정)
  useEffect(() => {
    const timer = setTimeout(() => {
      // OrbitControls의 객체
      if (controlsRef.current) {
        initialCameraPos.current.copy(camera.position);
        initialTarget.current.copy(controlsRef.current.target);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!scene) return;

    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());

    // 🔥 group 자체를 이동
    scene.position.sub(center);
  }, [scene]);

  useEffect(() => {
  if (!groupRef.current || !controlsRef.current) return;

  // 브라우저가 화면을 그리기 직전에 실행되는 함수
  requestAnimationFrame(() => {
    // OrbitControls 기준도 group 중심(0, 0, 0) 기준으로 맞춰짐
    const center = new THREE.Vector3(0, 0, 0);

    // 1️⃣ pivot 설정
    // 카메라가 보고있는 좌표
    controlsRef.current.target.copy(center);
    // 내부 상태 강제 동기화
    controlsRef.current.update();
    // 상태를 기준값으로 저장
    controlsRef.current.saveState();

    // 2️⃣ 초기값 저장 (🔥 이 순서 중요)
    initialTarget.current.copy(center);
    initialCameraPos.current.copy(camera.position);
  });

}, [scene]);

  // 🎯 클릭 처리
  const handleClick = (e) => {
    e.stopPropagation();

    // 클릭된 Mesh
    const clicked = e.object;
    // 클릭된 위치
    const target = e.point.clone();

    // 숨김대상 저장(되돌기 기능 가능)
    if(isHideMode){
      // 이전 상태를 안전하게 가져오기, 최신상태 유지하기위해 함수 형태
      setHiddenMesh(prev => {
        // 같은 mesh 객체면 true, 그대로 반환
        if(prev.includes(clicked)) return prev;
        // 기존 배열 복사 + 새 mesh 추가
        return [...prev, clicked];
      });
      return;
    }

    // ✅ 같은 mesh 다시 클릭 → 초기화
    // 문자열 비교하여 같은 객체인지 확인하고 초기화
    if (selectedMesh?.uuid === clicked.uuid) {
      setSelectedMesh(null);
      setSelectedName(null);

      // 실행되고 있던 애니메이션 강제 중단
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(controlsRef.current.target);

      gsap.to(camera.position, {
        x: initialCameraPos.current.x,
        y: initialCameraPos.current.y,
        z: initialCameraPos.current.z,
        duration: 0.8,
        ease: "power3.out",
        onUpdate: () => controlsRef.current.update()
      });

      gsap.to(controlsRef.current.target, {
        x: initialTarget.current.x,
        y: initialTarget.current.y,
        z: initialTarget.current.z,
        duration: 0.8,
        ease: "power3.out",
        onUpdate: () => controlsRef.current.update()
      });

      return;
    }

    // ✅ 새로운 선택
    setSelectedMesh(clicked);
    setSelectedName(clicked.name || "Unknown");

    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(controlsRef.current.target);

    // 카메라가 target 기준 어디에 있는지 방향 계산
    const direction = camera.position.clone().sub(target);
    // 카메라와 클릭 지점 사이 거리
    const currentDistance = direction.length();
    // 방향은 유지하고 길이는 1로 만듦
    direction.normalize();
    // 멀면 가까이 가까우면 최소 거리 유지
    const distance = Math.max(currentDistance * 0.1, 1.5);
    // target에서 direction 방향으로 distance만큼 떨어진 위치
    const newPosition = target.clone().add(direction.multiplyScalar(distance));

    // 카메라 이동
    // camera.position 카메라 위치
    gsap.to(camera.position, {
      x: newPosition.x,
      y: newPosition.y,
      z: newPosition.z,
      duration: 0.8,
      ease: "power3.out",
      // 매 프레임 업데이트
      onUpdate: () => controlsRef.current.update()
    });

    // 타겟 이동
    // controlsRef.current.target 카메라가 바라보는 곳
    gsap.to(controlsRef.current.target, {
      x: target.x,
      y: target.y,
      z: target.z,
      duration: 0.8,
      ease: "power3.out",
      onUpdate: () => controlsRef.current.update()
    });
  };

  // 🎯 선택 강조
  useEffect(() => {
    if (!scene) return;

    scene.traverse((child) => {
      if (child.isMesh) {
        // 숨김 처림
        if(hiddenMesh.includes(child)){
          child.visible = false;
          // 선택된 mesh ray 검사x
          // 클릭 안되게 막음
          child.raycast = () => null;
          return;
        }else{
          child.visible = true;
          // 객체가 ray랑 충돌했는지 계산
          child.raycast = THREE.Mesh.prototype.raycast;
        }
        // 원래 색 저장
        if(!child.userData.originalColor){
          child.userData.originalColor = child.material.color.clone();
        }
        // 선택 해제
        if(!selectedMesh){
          child.material.transparent = false;
          child.material.opacity = 1;
          child.material.color.copy(child.userData.originalColor);
          return;
        }
        if (child === selectedMesh) {
          child.material.transparent = false;
          child.material.opacity = 1;
          // set메소드 값 직접 설정
          child.material.color.set('green');
        } else {
          child.material.transparent = true;
          child.material.opacity = selectedMesh ? 0.2 : 1;
        }
      }
    });
  }, [selectedMesh, scene, hiddenMesh]);

  useEffect(() => {
    if(!scene) return;

    setTimeout(() => {
      window.renderDone = true;
    }, 300);
  }, [scene]);

  return (
    // group을 쓴 이유 회전중심을 통제하기 위해 
    <group ref={groupRef} scale={8}>
      <primitive object={scene} onClick={handleClick}/>
    </group>
  );
}

// png 이미지 저장
const handleExport = () => {
  setTimeout(() => {
    const canvas = document.querySelector('canvas');
    const dataURL = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'model.png';
    link.click();
  }, 100);
};

export default function App() {
  // 카메라를 제어하는 핵심 컨트롤러
  // 카메라 시선 담당
  const controlsRef = useRef();
  // 모델 전체를 제어하는 기준점(pivot)
  // 모델 전체를 감싸고, 회전/스케일/위치 기준이 되는 조작용 컨테이너
  // 모델 움직임 담당
  const groupRef = useRef();

  const [selectedName, setSelectedName] = useState(null);
  const [selectedMesh, setSelectedMesh] = useState(null);
  const [hiddenMesh, setHiddenMesh] = useState([]);
  const [isHideMode, setIsHideMode] = useState(false);
  const [IsMobile, setIsMobile] = useState(false);

  const isCapture = new URLSearchParams(window.location.search).get('capture') === 'true';

  const handleClick = () => {
    setIsHideMode(prev => !prev);
  };

  useEffect(() => {
    const check = () => {
      setIsMobile(
        'ontouchstart' in window || navigator.maxTouchPoints > 0
      );
    };

    check();
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>

      {/* 🎯 UI */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        color: 'white',
        fontSize: '18px',
        background: 'rgba(0,0,0,0.6)',
        padding: '10px 14px',
        borderRadius: '8px'
      }}>
        {selectedName || "None"}
      </div>

      <Canvas
        camera={{ position: [0, 0, 5]}}
        onPointerMissed={() => {
          setSelectedMesh(null);
          setSelectedName(null);
        }}
        // 랜더링 화면 지우지않고 유지
        gl={{preserveDrawingBuffer: true}}
      >
        <ambientLight intensity={1} />
        <directionalLight position={[2, 2, 2]} />

        <XrModel
          controlsRef={controlsRef}
          setSelectedName={setSelectedName}
          selectedMesh={selectedMesh}
          setSelectedMesh={setSelectedMesh}
          setHiddenMesh={setHiddenMesh}
          groupRef={groupRef}
          hiddenMesh={hiddenMesh}
          isHideMode={isHideMode}
        />

        {/* <OrbitControls
          ref={controlsRef}
          enableDamping={false}
          enableRotate={false}
          enablePan={!IsMobile}
          enableZoom={!IsMobile}
        /> */}
      </Canvas>

      {!isCapture && (
        <div style={{position: 'absolute', top:'20px', right: '20px'}}>
          <button style={{padding: '10px 20px', borderRadius: '10px', marginRight: '10px'}} onClick={handleClick}>
            {isHideMode? "Hide" : "Select"}
          </button>
          <button style={{padding: '10px 20px', borderRadius: '10px', marginRight: '10px'}} onClick = {() => setHiddenMesh([])}>Reset</button>
          <button style={{padding: '10px 20px', borderRadius: '10px'}} onClick={handleExport}>Export PNG</button>
        </div>
      )}
    </div>
  );
}