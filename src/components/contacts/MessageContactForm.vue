<!-- 
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0 
-->
<template>
  <div class="container">
    <div class="col-7 offset-md-3">
      <base-message :type="messageStyleType" v-if="message">{{
        message
      }}</base-message>
      <base-card v-if="contact">
        <template v-slot:title>
          <i class="bi bi-person-circle me-3"></i> Send message to: {{ contact.first_name }} {{ contact.last_name }}
        </template>
        <template v-slot:body>
          <form @submit.prevent="sendMessage">

            <div class="row">
              <div class="col-6">
                <div class="mb-3 text-start">
                  <label for="last-name" class="form-label">Number</label>
                  <input readonly
                    type="text"
                    class="form-control form-control-sm"
                    id="number"
                    v-model="contact.number"
                  />
                </div>
              </div>
              <div class="col-5">
                <div class="mb-3 text-start">
                  <label for="country" class="form-label">Message</label>
                  <textarea
                    class="form-control form-control-sm"
                    id="smsmessage"
                  />
                </div>
              </div>
            </div>
            <hr />
            <div class="text-start">
              <button
                class="btn btn-primary"
                type="button"
                disabled
                v-if="isLoading"
              >
                <span
                  class="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
                {{ buttonText }}
              </button>

              <button
                class="btn btn-danger me-2"
                @click.prevent="cancel"
                v-if="!isLoading"
              >
                <i class="bi bi-person-plus-fill me-2"></i>Cancel
              </button>

              <button class="btn btn-primary" v-if="!isLoading">
                <i class="bi bi-person-plus-fill me-2"></i>Send Message
              </button>
            </div>
          </form>
        </template>
      </base-card>
    </div>
  </div>
</template>

<script>
import { computed, onBeforeMount, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import { validataEditContactForm } from "../../utils/validator";
import useAlert from "../../hooks/alert";
import { POOL_DATA } from "../../config/cognito";

export default {
  setup() {
    // create a reference to Vuex store
    const store = useStore();

    //get access to Vuex router
    const router = useRouter();
    const route = useRoute();

    const buttonText = ref("Loading ...");

    //sets up hook for message alerting
    const { message, messageStyleType, setMessage } = useAlert();

    const contact = computed(function() {
      return store.getters.getContacts.find(
        (contact) => contact.id === route.params.id
      );
    });

    onBeforeMount(function() {
      store.dispatch("fetchContacts");
    });

    async function sendMessage() {
      if (!isValid()) {
        return;
      }
      
      console.log(store.state.authModule.idToken);
      console.log(store.state.authModule.credentials);
      
      // Load the AWS SDK for Node.js
      var AWS = require('aws-sdk');
      AWS.config.update({region: POOL_DATA.Region});
      AWS.config.credentials = store.state.authModule.credentials;
      
      // Create publish parameters
      var params = {
        Message: document.getElementById('smsmessage').value,
        //PhoneNumber: contact.number,
        PhoneNumber: "+14154259805",
      };
      
      // Create promise and SNS service object
      var publishTextPromise = new AWS.SNS({apiVersion: '2010-03-31'}).publish(params).promise();
      
      // Handle promise's fulfilled/rejected states
      publishTextPromise.then(
        function(data) {
          console.log("MessageID is " + data.MessageId);
          setMessage("Message has been sent successfully", "alert-success");
        }).catch(
          function(err) {
          console.error(err, err.stack);
          setMessage("Sending messages is a premium feature, you need an active subscription to use this feature.", "alert-danger");
        });

    }

    const isLoading = computed(function() {
      return store.getters.getIsLoading;
    });

    function cancel() {
      router.push("/contacts");
    }

    function isValid() {
      const validationData = validataEditContactForm(contact.value);

      if (!validationData.valid) {
        setMessage(validationData.message, "alert-danger");
        return false;
      }

      return true;
    }
    return {
      sendMessage,
      contact,
      isLoading,
      buttonText,
      message,
      messageStyleType,
      cancel,
    };
  },
};
</script>

<style></style>
