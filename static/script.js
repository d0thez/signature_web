
const canvas = document.getElementById('signature-pad');
const ctx = canvas.getContext('2d');
let drawing = false;

canvas.addEventListener('mousedown', () => drawing = true);
canvas.addEventListener('mouseup', () => drawing = false);
canvas.addEventListener('mouseout', () => drawing = false);
canvas.addEventListener('mousemove', draw);

function draw(e) {
    if (!drawing) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
}

function clearPad() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
}

function submitSignature() {
    const dataURL = canvas.toDataURL();
    fetch('/submit_signature', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'signature=' + encodeURIComponent(dataURL)
    })
    
    .then(response => {
        if (response.redirected) {
          window.location.href = response.url; // 페이지를 직접 이동시켜줌
        } else {
          return response.text().then(data => {
            alert(data); // 에러 메시지 등은 그대로 띄움
          });
        }
      });
}
