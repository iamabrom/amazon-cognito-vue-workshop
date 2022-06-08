<!-- 
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0 
-->
<template>
  <div class="container">
    <div v-bind:class="{ 'col-3 offset-md-5': isLargeScreen }">
      <base-message :type="messageStyleType" v-if="message">{{
        message
      }}</base-message>
      <base-card>
        <template v-slot:title>
          <i class="bi bi-person-fill me-2"></i>Sign In
        </template>
        <template v-slot:body>
          <form @submit.prevent="signIn('password')">
            <span v-if="!confirmMFACode">
              <div class="row">
                <div class="col-12">
                  <div class="mb-3 text-start">
                    <label for="state" class="form-label">Username</label>
                    <input
                      type="text"
                      id="current-password"
                      v-model.trim="username"
                      autocomplete="false"
                      class="form-control form-control-sm"
                    />
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-12">
                  <div class="mb-3 text-start">
                    <label for="state" class="form-label">Password</label>
                    <input
                      type="password"
                      class="form-control form-control-sm"
                      id="current-password"
                      v-model.trim="password"
                      autocomplete="false"
                    />
                  </div>
                </div>
              </div>
            </span>
            <div class="row" v-if="confirmMFACode">
              <div class="col-12">
                <div class="mb-3 text-start">
                  <label for="state" class="form-label">MFA Code</label>
                  <input
                    type="password"
                    class="form-control form-control-sm"
                    id="current-password"
                    v-model.trim="mfaCode"
                    autocomplete="false"
                  />
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-12">
                <div class="mb-3 text-start d-grid gap-2 col-12 mx-auto mt-2">
                  <button class="btn btn-small btn-primary">
                    <i class="bi bi-box-arrow-in-right me-1"></i>
                    {{ confirmMFACode ? "Confirm MFA Code" : "Sign In" }}
                  </button>
                </div>
              </div>
            </div>
            <div class="text-center">
              <router-link to="/forgotpassword"
                ><span class="figcaption">Forgot Password</span></router-link
              >
              |
              <router-link to="/signup"
                ><span class="figcaption">Sign Up</span></router-link
              >
            </div>
          </form>

          <hr>OR
          <div class="row">
            <div class="col-12">
              <div class="mb-3 text-start d-grid gap-2 col-12 mx-auto mt-2">
                <button class="btn btn-small btn-primary" @click="signIn('passwordless')">
                  <i class="bi bi-grid me-1"></i>
                  {{ "Sign In Password-less" }}
                </button>
              </div>
            </div>
          </div>

        </template>

      </base-card>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { useStore } from "vuex";
import { useRouter, useRoute } from "vue-router";
import { validateSignInForm } from "../../utils/validator";
import useAlert from "../../hooks/alert";
import {encode} from 'base64-arraybuffer';
const { coerceToBase64Url, coerceToArrayBuffer } = require('fido2-lib/lib/utils');

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";

import AWS from 'aws-sdk/global';

//imports userpool data from config
import { POOL_DATA } from "../../config/cognito";

export default {
  setup() {
    // create a reference to Vuex store
    const store = useStore();
    // creates a reference to Vue router
    const router = useRouter();
    const route = useRoute();

    // stores reactive ref to email and password inputs
    const username = ref("");
    const password = ref("");
    const mfaCode = ref("");

    //sets up hook for message alerting
    const { message, messageStyleType, setMessage } = useAlert();
    const confirmMFACode = ref(false);
    
    //---------------Cognito sign-in
    async function signIn(flow){
      
      const userPool = new CognitoUserPool(POOL_DATA);
        
        var authenticationData = {
          Username: username.value, //only username required since we will authenticate user using custom auth flow and will use security key
          Password: password.value
        };
        
        var userData = {
          Username: username.value,
          Pool: userPool,
        };
    
        var authenticationDetails = new AuthenticationDetails(authenticationData);
        cognitoUser = new CognitoUser(userData);
        
        if(flow === 'password'){ //sign-in using password only
  
          /**
          authenticateUser method will trigger authentication with USER_SRP_AUTH flow
          USER_SRP_AUTH doesn't trigger define auth challenge, this will just authenticate the user using password 
          (if SMS/TOTP MFA is configured for the user it will also be triggered)
          **/
          cognitoUser.authenticateUser(authenticationDetails, authCallBack);
          
        }else if(flow === 'passwordless'){ // sign-in using FIDO authenticator only
          /**
          initiateAuth method will trigger authentication with CUSTOM_AUTH flow and will not provide any challenge data initially
          This will allow define auth challenge to respond with CUSTOM_CHALLENGE
          **/
          
          cognitoUser.setAuthenticationFlowType('CUSTOM_AUTH');
          cognitoUser.initiateAuth(authenticationDetails, authCallBack);
          
        }else{ //sign-in with password and use FIDO for 2nd factor
          /**
          authenticateUser method will trigger authentication with CUSTOM_AUTH flow and will provide SRP_A as the challenge
          This will allow define auth challenge to authenticate user using SRP first and then respond with CUSTOM_AUTH
          **/
          
          cognitoUser.setAuthenticationFlowType('CUSTOM_AUTH');
          cognitoUser.authenticateUser(authenticationDetails, authCallBack);
          
        }
    }
    
    let cognitoUser;
    let authCallBack = {
    	
      onSuccess(session) {
        console.log(session);
        // saves user session info to Vue state system
        setUserSessionInfo(session);
        setTempCredentials(session);
    
        // after logging in user is navigated to contacts list
        router.replace({
          name: "Contacts",
          params: { message: "You have successfully signed in" },
        });
      },
      customChallenge: async function(challengeParameters) {
        // User authentication depends on challenge response
        //----------get creds from security key or platform authenticator
        var signinOptions = {
           "challenge": coerceToArrayBuffer(challengeParameters.challenge, "challenge"),//challenge was generated and sent from CreateAuthChallenge lambda trigger
           "timeout":1800000,
           "rpId":window.location.hostname,
           "userVerification":"preferred",
           "allowCredentials":[
              {
                 "id": coerceToArrayBuffer(challengeParameters.credId, "id"),
                 "type":"public-key",
                 "transports":["ble","nfc","usb","internal"]
              }
           ]
        }
        console.log(signinOptions);
        //get sign in credentials from authenticator
        const cred = await navigator.credentials.get({
          publicKey: signinOptions
        });
        
        //prepare credentials challenge response
        const credential = {};
        if (cred.response) {
          const clientDataJSON = encode(cred.response.clientDataJSON);
          const authenticatorData = encode(cred.response.authenticatorData);
          const signature = encode(cred.response.signature);
          const userHandle = encode(cred.response.userHandle);
          
          credential.response = {clientDataJSON, authenticatorData, signature, userHandle};
        }
        
        
        //send credentials to Cognito VerifyAuthChallenge lambda trigger for verification
        cognitoUser.sendCustomChallengeAnswer(JSON.stringify(credential), this);
        
      },
      onFailure(error) {
        console.log(error);
    
        // If MFA code is invalid error message is displayed
        if (!error.message.includes("SOFTWARE_TOKEN_MFA_CODE")) {
          setMessage(error.message, "alert-danger");
        }
    
        store.dispatch("setIsLoading", false);
      },
      totpRequired(codeDeliveryDetails) {
        confirmMFACode.value = true;
        cognitoUser.sendMFACode(mfaCode.value, this, codeDeliveryDetails);
      },
    }
  
    //helper function
    async function _fetch(path, payload){
      const headers = {'X-Requested-With': 'XMLHttpRequest'};
      if (payload && !(payload instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(payload);
      }
      const res = await fetch(path, {
        method: 'POST',
        credentials: 'same-origin',
        headers: headers,
        body: payload
      });
      if (res.status === 200) {
        return res.json();
      } else {
        const result = await res.json();
        throw result.error;
      }
    };

    // calculates when user will be auto logged out
    function autoTimeout(result) {
      const seconds_timeout = 3600;

      // sets user login to expire after 1 hour
      const expirationDate =
        +result.idToken.payload["auth_time"] + seconds_timeout;
      console.log(
        "Auth Time " + +result.idToken.payload["auth_time"],
        " Expire Date " + expirationDate
      );
      var expires_millseconds =
        (expirationDate - +result.idToken.payload["auth_time"]) * 1000;
      console.log("Expires in milliseconds ", expires_millseconds);

      return expires_millseconds;
    }

    function setUserSessionInfo(session) {
      // starts timer to auto logout after 1 hour
      setTimeout(function() {
        store.dispatch("autoLogout");
        console.log("auto logging out");
        router.replace("/signin");
        alert("You have been automatically logged out");
      }, autoTimeout(session));

      store.dispatch("setSession", session);
      store.dispatch("setIDToken", session.getIdToken().getJwtToken());
      store.dispatch("setUsername",session.idToken.payload["cognito:username"]);
      store.dispatch("setIsAuthenticated", true);
      store.dispatch("setEmail", session.idToken.payload.email);
      
    }
    
    function setTempCredentials(session){
      
      var loginObj = {};
      loginObj[POOL_DATA.IdentityPoolAuthProvider] = session.getIdToken().getJwtToken();
      
      AWS.config.region = POOL_DATA.Region;
      AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: POOL_DATA.IdentityPoolId,
        Logins: loginObj
      });
      
      // Make the call to obtain credentials
      AWS.config.credentials.get(function(){
        store.dispatch("setCredentials", AWS.config.credentials);

      });
    }

    onMounted(function() {
      if (route.params.message) {
        message.value = route.params.message;
      }
    });

    function isValid() {
      const validationData = validateSignInForm({
        username: username.value,
        password: password.value,
      });

      if (!validationData.valid) {
        setMessage(validationData.message, "alert-danger");
        return false;
      }

      return true;
    }

    return {
      username,
      password,
      signIn,
      message,
      messageStyleType,
      mfaCode,
      autoTimeout,
      confirmMFACode,
      setUserSessionInfo,
    };
  },
  
  data(){
    return {
        isLargeScreen: window.innerWidth >= 800
      }
  },
  created(){
    addEventListener('resize', () => {
      this.isLargeScreen = innerWidth >= 800
    })
  }
};
</script>
<style></style>
