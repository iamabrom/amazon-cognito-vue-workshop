# Integrating Cognito with a web application using JavaScript SDK - Workshop


This project is a fork from the original https://github.com/aws-samples/amazon-cognito-vue-workshop, please refer to the original repository for instructions on manual deployment and steps to build this workshop from scratch.
This forked project adds few features like support for WebAuthn and Password-less authentication, adding full automation to build the dev environment and adds features to get temporary AWS credentials and demonestrates Role based and attribute based access control patterns.

### Demployment steps

#### Clone the project

 git clone https://github.com/mmatouk/amazon-cognito-vue-workshop.git
 
 cd amazon-cognito-vue-workshop
 
 npm install

#### Create AWS resources

To create AWS resources needed to run this application, use the command below. This command references region us-west-2, if you are creating your resoirces in another region, make sure you edit the command accordingly.

aws cloudformation create-stack --stack-name cognito-workshop --template-body file://aws/UserPoolTemplate.yaml --capabilities CAPABILITY_AUTO_EXPAND CAPABILITY_IAM CAPABILITY_NAMED_IAM --region us-west-2

This template will create several resources including (but not limited to)
- Cognito User Pool, application client and IAM roles/policies
- Lambda functions to be used for custom authentication flow and all IAM resources required for it
- Cognito Identity Pool and IAM roles/policies required for it to work properly
- API Gateway resources and sample method that uses Cognito Authorizer for authorization

#### Update configuration

After creating the CloudFormation stack in previous step, you can get the configuration details required to run this demo application from the Output section of the created stack. You can view this from the console or run the command below

aws cloudformation describe-stacks --stack-name cognito-workshop --region us-west-2
 
Open the file src/config/cognito.js and update the configuration from values in stack outputs then save the changes

Now you can run the application, this application has two separate apps that will run on separate ports. Front-end is the web application part and this runs on port 8080, there is also a leightweight backend running at port 8081 and this is required for WebAuthn feature to work.
This backend is used to create and validate request and response passed to/from authenticator devices.

to run the frontend application use the command below

npm run serve

to run the backend service use the command below

node server.js

Front-end application is now running at port 8080 and server is running on 8081, however, to be able to use WebAuthn we need to enable HTTPS protocol for the web app and also create a rule that allows requests to /authn route to be directed to a diffrent port (the port of the backend application)

To do that, we will use NGINX as configured in next step.

#### Install and configure NGINX

NGINX installation depends on your environment, commands may be diffrent but the configuration steps and configuration data should be the same.

###### Install NGINX
sudo yum install nginx

###### Create self-signed certificate to be used for HTTPS configuration
sudo mkdir /etc/ssl/private
sudo chmod 700 /etc/ssl/private
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/nginx-selfsigned.key -out /etc/ssl/certs/nginx-selfsigned.crt

You will be asked series of questions to create the certificate, please follow the on-screen guidance and complete the creation of SSL certificate

###### Configure NGINX
Open nginx.conf file in test editor, if you are not sure where this file is located you can use the command nginx -t to display the properties

vi /etc/nginx/nginx.conf

Edit the file to include two server configurations to listed on ports 80 and 443 as below

    server {
        listen 80 default_server;
        listen [::]:80 default_server;
        # Load configuration files for the default server block.
        include /etc/nginx/default.d/*.conf;

        location / {
            proxy_pass http://localhost:8080;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        location /api/ {
                proxy_pass         http://localhost:8081;
                proxy_redirect     off;
                proxy_set_header   Host $host;
                proxy_set_header   X-Real-IP $remote_addr;
                proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header   X-Forwarded-Host $server_name;
        }

        # redirect server error pages to the static page /50x.html
        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }
    }
    
    # HTTPS server
    #
    server {
        listen 443 http2 ssl;
        listen [::]:443 http2 ssl;

        server_name your_server_ip;

        ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
        ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;

        ssl_session_cache    shared:SSL:1m;
        ssl_session_timeout  5m;

        ssl_ciphers  HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers  on;

        location / {
            proxy_pass http://localhost:8080;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        location /authn/ {
                proxy_pass         http://localhost:8081;
                proxy_redirect     off;
                proxy_set_header   Host $host;
                proxy_set_header   X-Real-IP $remote_addr;
                proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header   X-Forwarded-Host $server_name;
        }
    }

Save and close the file then start nginx

sudo service nginx start 

#### Run the application
If you haven't already started the application, use the commands below
npm run serve
node server.js

Now you should be able to access the demo app using the url https://localhost
**Note** since we are using self-signed certiicate for HTTPS, browsers will display warning message and you may have to manually accept the risk to proceed to the web application.

#### Testing basic subscriber

#### Testing premium subscriber

#### Clean-up

To terminate all AWS resources created for this demo application, use the command below to delete the stack that was created earlier

aws cloudformation delete-stack --stack-name cognito-workshop --region us-west-2

### Resource Links

- [Get more information about Vue 3](https://v3.vuejs.org/)

### Next Steps

In the next section you will walk-through accessing your development environment for the workshop, and retrieving the source code for the workshop

## [Accessing Development Environment](docs/DevSetup.md)
