const express = require('express')
const app = express()
const request = require('request');
const bodyParser = require('body-parser')
const cmd=require('node-cmd');

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});
app.use(bodyParser.json())
function pausecomp(millis)
{
    var date = new Date();
    var curDate = null;
    do { curDate = new Date(); }
    while(curDate-date < millis);
}

function describeTask(describeTaskStr,taskARN,res){
	cmd.get(describeTaskStr, function(err, data, stderr){
           	    if (!err) {
                			eniOutputStr = JSON.parse(data);
					var eni = "";
					console.log(1);
					if(eniOutputStr.tasks[0].lastStatus=="PROVISIONING"){
						pausecomp(5000);
						return describeTask(describeTaskStr,taskARN,res);
					}
					else{
						for(val of eniOutputStr.tasks[0].attachments[0].details){
							if(val.name=="networkInterfaceId"){
								eni = val.value;
								break;
							}
						}
						if(eni=='unset'){
							console.log('describe task ' + data);
							console.log('eni '+ eni);
							pausecomp(5000);
                                                	return describeTask(describeTaskStr,taskARN,res);
						}
						eniDescribeStr = "aws ec2 describe-network-interfaces --network-interface-ids "+eni;
						console.log(eniDescribeStr);
                        			if(eniDescribeStr){
                        			cmd.get(eniDescribeStr, function(err, data, stderr){
                                                	if (!err) {
	                                                        console.log(data);
								eniDescribeOutputStr = JSON.parse(data);
								var toBeSent = {};
								toBeSent['url']=eniDescribeOutputStr.NetworkInterfaces[0].PrivateIpAddresses[0].Association.PublicIp;
								toBeSent['taskARN']=taskARN;
								res.send(toBeSent);
                                                        }
                                                        else {
        	                                                console.log('error', err);
                		                                res.send(stderr);
                                                        }
                        			});
						}else{
                        	        		res.send(eniDescribeStr+"++++");
                        			}
					}
                      	  		
                }
                else {
                   	    		console.log('error', err);
                        		res.send(stderr);
               	}
    });
}

app.post('/stopTask', function(req, res) {

        var taskARN = req.body.taskARN;
	var removeTask = "aws ecs stop-task --task " + taskARN;  
						cmd.get(removeTask, function(err, data, stderr){
                                                        if (!err) {
                                                                console.log(data);
                                                                eniDescribeOutputStr = JSON.parse(data);
                                                                var toBeSent = {};
                                                                toBeSent['status']="done";
                                                                res.send(toBeSent);
                                                        }
                                                        else {
                                                                /*console.log('error', err);*/
								var toBeSent = {};
								toBeSent['status']="notDone";
								toBeSent['message'] = stderr;
                                                                res.send(toBeSent);
                                                        }
                                                });
});


app.post('/', function(req, res) {


	var exec = require('child_process').exec;

	var high = 25000;
	
	var low = 11000;
	
	//var user_port = Math.floor(Math.random() * (high - low) + low);

	console.log("123456789$$backend"+req.body.backendURL);
	console.log("123456789$$redirect"+req.body.redirectURL);	
	var parentTestId = req.body.parentTestId;
        var backendURL = req.body.backendURL;	
	var duration = req.body.duration;
	var imageName = req.body.imageName;
	var accessToken = req.body.accessToken;
	var userId = req.body.userId;
	var testId = req.body.testId;
	var gitProjectId = req.body.gitProjectId;
	var redirectURL = req.body.redirectURL;

	var runTaskStr = 'aws ecs run-task --cluster default --overrides \'{ "containerOverrides": [ { "name":"iap-container02","environment": [ { "name": "VNC_ACCESS_TOKEN", "value": "'+accessToken+'" }, { "name": "BACKEND_URL", "value": "'+backendURL+'" }, { "name": "REDIRECT_URL", "value": "'+redirectURL+'" }, { "name": "PARENT_TEST_ID", "value": "'+parentTestId+'" }, { "name": "USER_EMAIL", "value": "'+userId+'" }, { "name": "CONTEST_ID", "value": "'+testId+'"}, { "name": "PROJECT_ID", "value": "'+gitProjectId+'" },{"name":"DURATION","value":"'+duration+'"} ] } ] }\' --network-configuration "awsvpcConfiguration={subnets=[subnet-0f46e4a00f34871d5],securityGroups=[sg-8c3298f4],assignPublicIp=ENABLED}" --launch-type "FARGATE" --task-definition ' + imageName;

	//docker run -p 8900:80 --memory=2g --memory-swap=4g -e USER_PORT=8900 -d wednesday_demo7_10:v60
	//exec('docker run -p '+user_port+':80 --memory=2g -e USER_PORT='+user_port + " -e ACCESS_TOKEN="+VNCAccessToken+" -e USER_ID="+userId+" -e TEST_ID="+testId+" -e PROJECT_ID="+gitProjectId+' '+imageName, 
	/*exec(str,
(err, stdout, stderr) => {
	  	/*if (err) {
    			// node couldn't execute the command
    			return;
  		}
		console.log("#"+stdout+"#");
		res.send(stdout);	
	});*/

	cmd.get(runTaskStr, function(err, data, stderr){
                if (!err) {
                	taskArn = JSON.parse(data);
			console.log(data);
			console.log(taskArn.tasks[0].containers[0].taskArn);
			describeTaskStr='aws ecs describe-tasks --tasks "'+taskArn.tasks[0].containers[0].taskArn+'"';
			eniDescribeStr = describeTask(describeTaskStr,taskArn.tasks[0].containers[0].taskArn,res);
			/*console.log(eniDescribeStr);
			if(eniDescribeStr){
			cmd.get(eniDescribeStr, function(err, data, stderr){
											if (!err) {
								
													res.send(data);
											}
											else {
													console.log('error', err);
													res.send(stderr);
											}
			});}else{
				res.send(eniDescribeStr+"++++");
			}*/
                }else {
                        console.log('error', err);
			res.send(stderr);
                }
        });

	/*function execute(command){
    		exec(command, function(error, stdout, stderr){ 
			console.log(stdout);
			if(stdout.indexOf("curl:")!=-1)
				execute("curl localhost:"+user_port);
			else{
				
				res.send(''+user_port);
			} 
		});
	};*/	

	//execute("curl localhost:"+user_port);
})
app.post('/check', function(req, res) {
    console.log(req.body)
    let getOptions={
        url:'http://localhost:'+req.body.port,
        method:'GET'
    }
    console.log("getOptions:",getOptions)
    request(getOptions, function(error,response,body){
        console.log(error)
        if(!error){
                console.log(response.statusCode);
                res.send('200');
        }else{

                res.send("502");
        }
    })
        //exec("curl localhost:"+port,function());

})


app.listen(8000, () => console.log('Example app listening on port 8000!'))
