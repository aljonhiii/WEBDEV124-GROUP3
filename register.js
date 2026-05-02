const FAKE_OTP = "123456";

function nextStep(step){
document.getElementById("step"+step).classList.add("hidden");
document.getElementById("step"+(step+1)).classList.remove("hidden");
updateBar(step+1);
}

function prevStep(step){
document.getElementById("step"+step).classList.add("hidden");
document.getElementById("step"+(step-1)).classList.remove("hidden");
updateBar(step-1);
}

function updateBar(step){
for(let i=1;i<=4;i++){
let el=document.getElementById("step-indicator-"+i);
if(i<=step){
el.classList.add("active");
}else{
el.classList.remove("active");
}
}
}

function simulateSendOTP(){
document.getElementById("step3").classList.add("hidden");
document.getElementById("step4").classList.remove("hidden");
}

document.getElementById("registerForm").addEventListener("submit",function(e){
e.preventDefault();

const otp=document.getElementById("otp_input").value;

if(otp!==FAKE_OTP){
alert("Invalid OTP");
return;
}

alert("Account Created!");
window.location.href="login.html";
});