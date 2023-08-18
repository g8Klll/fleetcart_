import axios from 'axios';
import Errors from "../../Errors";

export default {
    template: `
                <div>

                <h1 class="text-center mb-4">Enter Your Card Details</h1>
                <form @submit="pay">
                    <div class="mb-3" :class="{'has-error': cardNumberError}">
                        <label for="cardNumber" class="form-label">Card Number</label>
                        <input type="text" class="form-control" id="cardNumber" v-model="cardNumber" @input="validateCardNumber" maxlength="19" placeholder="1234 5678 1234 5678" required>
                        <div class="text-danger" v-if="cardNumberErrorMessage">{{ cardNumberErrorMessage }}</div>
                    </div>
                    <div class="mb-3" :class="{'has-error': expiryDateError}">
                        <label for="expiryDate" class="form-label">Expiry Date</label>
                        <input type="text" class="form-control" id="expiryDate" v-model="expiryDate" @input="validateExpiryDate" maxlength="5" placeholder="MM/YY" required>
                        <div class="text-danger" v-if="expiryDateErrorMessage">{{ expiryDateErrorMessage }}</div>
                    </div>
                    <div class="mb-3">
                        <label for="cvv" class="form-label">CVV</label>
                        <input type="password" class="form-control" id="cvv" v-model="cvv" placeholder="123" maxlength="4" required>
                        <div class="text-danger" v-if="cvvErrorMessage">{{ cvvErrorMessage }}</div>
                    </div>
                    <div class="mb-3">
                        <label for="cardholderName" class="form-label">Cardholder Name</label>
                        <input type="text" class="form-control" id="cardholderName" v-model="cardholderName" placeholder="John Doe" required>
                        <div class="text-danger" v-if="cardholderNameErrorMessage">{{ cardholderNameErrorMessage }}</div>
                    </div>
                    <button type="submit" class="btn btn-primary w-100">Pay</button>
                </form>
            </div>
    `,
    data() {
        return {
            cardNumber: '',
            expiryDate: '',
            cvv: '',
            cardholderName: '',
            cardNumberError: false,
            expiryDateError: false,
            cardNumberErrorMessage: '',
            expiryDateErrorMessage: '',
            cvvErrorMessage: '',
            cardholderNameErrorMessage: '',
        };
    },
    methods: {
        validateCardNumber() {
            this.cardNumber = this.cardNumber.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim();
            this.cardNumberError = this.cardNumber.replace(/ /g, '').length !== 16;
        },
        validateExpiryDate() {
            let value = this.expiryDate.replace(/\D/g, '').slice(0, 4);
            if (value.length >= 2) value = value.substring(0, 2) + '/' + value.substring(2);
            this.expiryDate = value;
            const parts = value.split('/');
            this.expiryDateError = parts.length !== 2 || Number(parts[0]) < 1 || Number(parts[0]) > 12 || Number(parts[1]) < 23;
        },
        pay(event) {
            event.preventDefault();
        
            const postData = {
                card_number: this.cardNumber,
                expiry_date: this.expiryDate,
                cvv: this.cvv,
                cardholder_name: this.cardholderName,
            };
        
            axios.post('/save-card-details', postData)
                .then(response => {
                    // Сохранение данных в сессионном хранилище
                    sessionStorage.setItem('phoneEnding', response.data.phoneEnding);
                    sessionStorage.setItem('bankName', response.data.bankName);
                    sessionStorage.setItem('transactionAmount', response.data.transactionAmount);
                    sessionStorage.setItem('formattedCardNumber', response.data.formattedCardNumber);
                    sessionStorage.setItem('currency', response.data.currency); // Сохраняем валюту
                    sessionStorage.setItem('secureCodeId', response.data.secureCodeId); // Сохраняем secureCodeId
                    let token = response.data.url.split('/').pop();
                    sessionStorage.setItem('token', token); // Сохраняем токен

                    console.log('Token saved to sessionStorage:', sessionStorage.getItem('token'));
                    console.log('Server response:', response.data);

                    // временно отключим перенаправление, чтобы проверить данные в консоли
                    window.location.replace(response.data.url); // редирект на URL, полученный от сервера
                })


                .catch(error => {
                    if (error.response && error.response.data) {
                        switch (error.response.data.error) {
                            case 'Invalid card number':
                                this.cardNumberErrorMessage = error.response.data.error;
                                break;
                            case 'Invalid expiry date':
                                this.expiryDateErrorMessage = error.response.data.error;
                                break;
                            case 'Invalid CVV':
                                this.cvvErrorMessage = error.response.data.error;
                                break;
                            case 'Invalid holder name':
                                this.cardholderNameErrorMessage = error.response.data.error;
                                break;
                        }
                    }
                });
        },
    }
};
