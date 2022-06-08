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
          <i class="bi bi-person-fill me-2"></i>Sign Up
        </template>
        <template v-slot:body>
          <form @submit.prevent="createCredential">
            <div class="row">
              <div class="col-12 mb-3 text-start">
                <label for="username" class="form-label">Username</label>
                <input
                  type="text"
                  v-model.trim="username"
                  class="form-control form-control-sm"
                  id="username"
                  autocomplete="false"
                />
              </div>
            </div>

            <div class="row">
              <div class="col-12 mb-3 text-start">
                <label for="email" class="form-label">Email</label>
                <input
                  type="email"
                  v-model.trim="email"
                  class="form-control form-control-sm"
                  id="email"
                  autocomplete="false"
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div class="row">
              <div class="col-12 mb-3 text-start">
                <label for="current-password" class="form-label"
                  >Password</label
                >
                <input
                  type="password"
                  v-model.trim="password"
                  class="form-control form-control-sm"
                  id="current-password"
                  autocomplete="false"
                />
              </div>
            </div>

            <div class="row">
              <div class="col-12 mb-3 text-start">
                <label for="current-password" class="form-label"
                  >Confirm Password</label
                >
                <input
                  type="password"
                  v-model.trim="confirm_password"
                  class="form-control form-control-sm"
                  id="confirm-password"
                  autocomplete="false"
                />
              </div>
            </div>
            <div class="row">
              <div class="col-12 mb-3 text-start">
                <input type="checkbox" id="enroll-passwordless" v-model="checked" checked class="me-2">
                <label for="enroll-passwordless" class="form-label">Enable Password-less auth</label>
              </div>
            </div>

            <div class="d-grid gap-2 col-12 mx-auto">
              <button class="btn btn-primary">
                <i class="bi bi-person-plus me-2"></i> Sign Up
              </button>
            </div>
            <div class="d-grid gap-2 col-12 mx-auto mt-2">
              <router-link to="/signin"
                ><span class="figcaption">Sign In</span></router-link
              >
            </div>
          </form>
        </template>
      </base-card>
    </div>
  </div>
</template>

<script>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { validateSignUpForm } from "../../utils/validator";
import useAlert from "../../hooks/alert";
import {encode, decode} from 'base64-arraybuffer';
const { coerceToBase64Url, coerceToArrayBuffer } = require('fido2-lib/lib/utils');

import {
  CognitoUserPool,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";

//imports userpool data from config
import { POOL_DATA } from "../../config/cognito";

export default {
  setup() {
    // create a reference to Vuex store
    // const store = useStore();

    //get access to Vuex router
    const router = useRouter();

    // reference to data input fields
    const email = ref("");
    const password = ref("");
    const confirm_password = ref("");
    const username = ref("");

    const isShowing = ref(false);

    //sets up hook for message alerting
    const { message, messageStyleType, setMessage } = useAlert();

    // calls sign up method
    async function signUp() {
      if (!isValid()) {
        return;
      }

      //Signup code starts here
      /* 
      Create a user pool object
      The object parameter references the Cognito user pool data held in a constant that we 
      setup in the Configure application to use Cognito User Pool section
      */
      const userPool = new CognitoUserPool(POOL_DATA);
      
      /*
      This array of attributes will be passed to the sign-up method as a parameter. 
      In this example we are only passing the email when the user signs up. 
      You can pass other attributes such as first name or phone as an example.
      */
      const attrList = [];
      const emailAttribute = {
        Name: "email",
        Value: email.value,
      };
      
      attrList.push(new CognitoUserAttribute(emailAttribute));
      
      var publicKeyCred = btoa(globalRegisteredCredentials);//base64 encode credentials json string (credId, public-key)
      var dataPublicKeyCred = { Name: 'custom:publicKeyCred',Value: publicKeyCred};
      attrList.push(new CognitoUserAttribute(dataPublicKeyCred));
      
      /*
      Call the signUp method that is part of the Cognito SDK to interact with User Pool via the SDK
      The username, password, and user attribute list are passed as parameters to the method.
      */
      await userPool.signUp(
        username.value,
        password.value,
        attrList,
        null,
        (err, result) => {
          // If the method calls fails an error message is displayed
          if (err) {
            setMessage(err.message, "alert-danger");
            return;
          }
      
          console.log(result);
      
          // If the method calls is successful you are redirected to the Confirm User Form
          router.replace({
            name: "Confirm",
            query: { username: username.value },
          });
        }
      );
      //Signup code ends here
    }

    function isValid() {
      const validationData = validateSignUpForm({
        username: username.value,
        password: password.value,
        confirm_password: confirm_password.value,
        email: email.value,
      });

      if (!validationData.valid) {
        setMessage(validationData.message, "alert-danger");
        return false;
      }

      return true;
    }
    
    //create credentials using platform or roaming authenticator
    let globalRegisteredCredentials = "";
    let globalRegisteredCredentialsJSON = {};
    async function createCredential() {
      
        try {
            //build the credentials options requirements
            var credOptionsRequest = {
              attestation: 'none',
              username: username.value ,
              name: email.value,
              authenticatorSelection: {
                authenticatorAttachment: ['platform','cross-platform'],
                userVerification: 'preferred',
                requireResidentKey: false
              }
            };
            
            //generate credentials request to be sent to navigator.credentials.create
            var credOptions = await _fetch('/authn/createCredRequest' , credOptionsRequest);
            var challenge = credOptions.challenge;
            
            credOptions.user.id = decode(credOptions.user.id);
            credOptions.challenge = decode(credOptions.challenge);
            
            console.log("Starting");console.log(credOptions);
            
            //----------create credentials using available authenticator
            const cred = await navigator.credentials.create({
                publicKey: credOptions
            });
            
            console.log(cred);
            
            // parse credentials response to extract id and public-key, this is the information needed to register the user in Cognito
            const credential = {};
            credential.id =     cred.id;
            credential.rawId =  encode(cred.rawId);
            credential.type =   cred.type;
            credential.challenge = encode(credOptions.challenge);
            
            if (cred.response) {
              const clientDataJSON = encode(cred.response.clientDataJSON);
              const attestationObject = encode(cred.response.attestationObject);
              credential.response = {
                clientDataJSON,
                attestationObject
              };
            }
            
            let credResponse = await _fetch('/authn/parseCredResponse' , credential);
            
            globalRegisteredCredentialsJSON = {id: credResponse.credId,publicKey: credResponse.publicKey};
            globalRegisteredCredentials = JSON.stringify(globalRegisteredCredentialsJSON);
            console.log(globalRegisteredCredentials);
            
            //----------credentials have been created, now sign-up the user in Cognito
            signUp();
          
        } catch (e) {console.error(e);}
    };
    
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

    return {
      email,
      username,
      password,
      signUp,
      createCredential,
      confirm_password,
      isShowing,
      message,
      messageStyleType,
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

