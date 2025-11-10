document.addEventListener("DOMContentLoaded", function () {
  const btnSecret = document.getElementById("btnSecret");
  const allViews = document.querySelectorAll(".view"); // 매일성경, 지침, 비밀 다 가져옴
  const secretView = document.getElementById("view-secret");

  let secretUnlocked = false;
  const SECRET_PASSWORD = "1234"; // 여기 숫자만 바꿔서 써

  if (btnSecret) {
    btnSecret.addEventListener("click", function () {
      // 1) 아직 안 열렸으면 비번부터
      if (!secretUnlocked) {
        const input = prompt("비밀 공간 비밀번호를 입력하세요.");
        if (input !== SECRET_PASSWORD) {
          alert("비밀번호가 맞지 않습니다.");
          return;
        }
        secretUnlocked = true;
      }

      // 2) 여기까지 오면 열어준다
      // 다른 화면들 숨기고
      allViews.forEach(v => v.classList.remove("active"));
      // 비밀 화면만 보여주기
      if (secretView) {
        secretView.classList.add("active");
      } else {
        console.warn("view-secret 섹션을 찾을 수 없습니다. index.html에 추가했는지 확인하세요.");
      }
    });
  }
});

  // 3) 계산 버튼 로직
  const calcBtn = document.getElementById("calc-btn");
  if (calcBtn) {
    calcBtn.addEventListener("click", function () {
      const cnPrice = Number(document.getElementById('cn-price').value) || 0;
      const exRate = Number(document.getElementById('exchange-rate').value) || 0;
      const intlFee = Number(document.getElementById('intl-fee').value) || 0;
      const domesticFee = Number(document.getElementById('domestic-fee').value) || 0;

      const dutyRate = (Number(document.getElementById('duty-rate').value) || 0) / 100;
      const vatRate = (Number(document.getElementById('vat-rate').value) || 0) / 100;
      const otherTax = Number(document.getElementById('other-tax').value) || 0;

      const coupangFee = (Number(document.getElementById('coupang-fee').value) || 0) / 100;
      const naverFee = (Number(document.getElementById('naver-fee').value) || 0) / 100;
      const cardFee = (Number(document.getElementById('card-fee').value) || 0) / 100;

      const marginRate = (Number(document.getElementById('margin-rate').value) || 0) / 100;

      // 1) CNY → KRW
      const baseKRW = cnPrice * exRate;
      // 2) 운임/포장 포함 원가
      const costBeforeTax = baseKRW + intlFee + domesticFee;
      // 3) 관세
      const duty = costBeforeTax * dutyRate;
      // 4) 부가세
      const vat = (costBeforeTax + duty) * vatRate;
      // 5) 최종 원가
      const totalCost = costBeforeTax + duty + vat + otherTax;

      function calcSellPrice(channelFee) {
        const totalRate = channelFee + cardFee + marginRate;
        if (totalRate >= 1) return null;
        return Math.ceil(totalCost / (1 - totalRate));
      }

      const coupangPrice = calcSellPrice(coupangFee);
      const naverPrice = calcSellPrice(naverFee);

      const resultBox = document.getElementById('calc-result');
      document.getElementById('base-cost-line').textContent =
        `총 원가(세금 포함): ${totalCost.toLocaleString()}원`;

      if (coupangPrice === null) {
        document.getElementById('coupang-result').textContent =
          '수수료+마진 비율이 100%를 넘어서 계산할 수 없습니다.';
      } else {
        document.getElementById('coupang-result').textContent =
          `판매가: ${coupangPrice.toLocaleString()}원`;
      }

      if (naverPrice === null) {
        document.getElementById('naver-result').textContent =
          '수수료+마진 비율이 100%를 넘어서 계산할 수 없습니다.';
      } else {
        document.getElementById('naver-result').textContent =
          `판매가: ${naverPrice.toLocaleString()}원`;
      }

      resultBox.style.display = 'block';
    });
  }
