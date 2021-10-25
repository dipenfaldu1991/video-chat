console.log("workuing")



var mapPeers = []//stores 2 items list where the first element is rtc peer connecation and the second is the data channel


// var labelUsername = document.querySelector("#label-username")
var usernameInput = document.querySelector("#username-input")
var btnJoin = document.querySelector("#btn-join")

var username;

var webSocket;

function webSocketOnMessage(event)
{
    
    
    var parseData = JSON.parse(event.data);
    // var message = parseData['message']
    var peerUsername =parseData['peer']
    var action =parseData['action']

    if(username == peerUsername)
    {
        return
    }

    var receiver_channel_name = parseData['message']['receiver_channel_name']

    if(action=='new-peer')
    {
        createOfferer(peerUsername,receiver_channel_name)
        return
    }

    if(action == 'new-offer')
    {
        var offer = parseData['message']['sdp']

        createAnswerer(offer,peerUsername,receiver_channel_name)
    }
    if(action == "new-answer")
    {
        var answer  = parseData['message']['sdp']
        var peer = mapPeers[peerUsername][0]
        peer.setRemoteDescription(answer)
    }
    // console.log("themessage is ",message)
}
btnJoin.addEventListener("click",function(){
    username = usernameInput.value
    console.log("username",username)
    if(username =="")
    {
        return;
    }
    else
    {
        usernameInput.value = ""
        usernameInput.disabled = true
        usernameInput.style.visibility = 'hidden'

        btnJoin.disabled = true
        btnJoin.style.visibility = 'hidden'

        var labelUsername =document.querySelector("#label-username")
        labelUsername.innerHTML = username

        var loc  = window.location
        var wsstart = 'ws://'

        if(loc.protocol == "https:")
        {
            wsstart = 'wss"//'
        }

        var endPoint = wsstart +loc.host +loc.pathname
        // console.log("loc.host",loc.host)
        // console.log("loc.pathname",loc.pathname)
        console.log("endpoint",endPoint)
        
        webSocket = new WebSocket(endPoint);
        
        webSocket.addEventListener('open',function(){
            console.log("connection opened")

            send_signal('new-peer',{})
            console.log("donewa")
        })
        webSocket.addEventListener('message',webSocketOnMessage)
        webSocket.addEventListener('close',function(){
            console.log("connection closed")
        })
        webSocket.addEventListener('error',function(){
            console.log("error occured")
        })
    }
})


var localStream = new MediaStream();

const constraints = {
    'video':true,
    'audio':true
}

const localVideo = document.querySelector("#local-video")
const btnToggleAudio = document.querySelector("#btn-toggle-audio")
const btnToggleVideo = document.querySelector("#btn-toggle-video")

var userMedia = navigator.mediaDevices.getUserMedia(constraints).then(stream =>{
    localStream = stream
    localVideo.srcObject = localStream
    localVideo.muted=true


    var audioTracks = stream.getAudioTracks()
    var videoTracks = stream.getVideoTracks()


    audioTracks[0].enabled = true
    videoTracks[0].enabled = true

    btnToggleAudio.addEventListener("click",()=>{
        audioTracks[0].enabled = !audioTracks[0].enabled

        if(audioTracks[0].enabled)
        {
            btnToggleAudio.innerHTML ="Audio Mute"
            return
        }
        else
        {
            btnToggleAudio.innerHTML ="Audio unMute"
            return
        }



    
    })


    btnToggleVideo.addEventListener("click",()=>{
        videoTracks[0].enabled = !videoTracks[0].enabled

        if(videoTracks[0].enabled)
        {
            btnToggleVideo.innerHTML ="Video Off"
            return
        }
        else
        {
            btnToggleVideo.innerHTML ="Video On"
            return
        }



    
    })

}).catch(error =>{
    console.log("error",error)
})



// var jsonStr = JSON.stringify({
//     "peer":username,
//     "action":"new-peer",
//     // "action":"new-offer",
//     // "action":"new-answer", response to new offer 
//     "message":"test message1212"
// })

// webSocket.onopen = function() {
//     webSocket.send('Hello server')
//     webSocket.close()
// }



function send_signal(action,message)
{
    var jsonStr = JSON.stringify({
        "peer":username,
        "action":action,
        // "action":"new-offer",
        // "action":"new-answer", response to new offer 
        "message":message
    })

    webSocket.send(jsonStr)

}


function createOfferer(peerUsername,receiver_channel_name)
{
    var peer = new RTCPeerConnection(null);//will work for only same network devices.for different network devieces serach stun and turn servers

    addLocalTracks(peer);

    var dc = peer.createDataChannel('channel');
    dc.addEventListener("open",function(){
        console.log("connection opened")
    })

    dc.addEventListener("message",dcOnMessage)
    var remoteVideo = createVideo(peerUsername)
    setOnTrack(peer,remoteVideo)

    mapPeers[peerUsername] = [peer,dc]

    peer.addEventListener("iceconnectionstatechange",function(){
        var iceConnectionState = peer.iceConnectionState

        if(iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState==='closed') 
        {
            delete mapPeers[peerUsername]

            if(iceConnectionState !="closed")
            {
                peer.close()
            }
            removeVideo(remoteVideo)
        }
    })

    peer.addEventListener("icecandidate",function(event){
        if(event.candidate)
        {
            console.log("new ice candidate",JSON.stringify(peer.localDescription))
            return 
        }

        send_signal('new-offer',{
            'sdp':peer.localDescription,
            'receiver_channel_name':receiver_channel_name
        })
    })


    peer.createOffer().then(o => peer.setLocalDescription(o)).then(function(){
        console.log("local description set successfully")
    })
}

function addLocalTracks(peer)
{
    localStream.getTracks().forEach(function(track){
        peer.addTrack(track,localStream)
    })
    return 
}

var msg_list = document.querySelector("#message-list")
function dcOnMessage(event)
{
    var message = event.data;
    var li = document.createElement("li")
    li.appendChild(document.createTextNode(message))
    msg_list.appendChild(li)
}

function createVideo(peerUsername)
{
    var videoContainer = document.querySelector("#video-container")
    var remoteVideo = document.createElement("video")

    remoteVideo.id=peerUsername+"-video"
    remoteVideo.autoplay = true
    remoteVideo.playsInline = true


    var videoWrapper = document.createElement("div")
    videoContainer.appendChild(videoWrapper)
    videoWrapper.appendChild(remoteVideo)

}

function setOnTrack(peer,remoteVideo)
{
    var remoteStream = new MediaStream()

    remoteVideo.srcObject = remoteStream
    peer.addEventListener('track',async function(event){
        remoteStream.addTrack(event.track,remoteStream)
    })
}


function removeVideo(Video)
{
    var videoWrapper = video.parentNode;
    videoWrapper.parentNode.removeChild(Video);
}


function createAnswerer(offer,peerUsername,receiver_channel_name)
{
    var peer = new RTCPeerConnection(null);//will work for only same network devices.for different network devieces serach stun and turn servers

    addLocalTracks(peer);



    // dc.addEventListener("message",dcOnMessage)
    var remoteVideo = createVideo(peerUsername)
    setOnTrack(peer,remoteVideo)



    peer.addEventListener('datachannel',e =>{
        peer.dc = e.channel
        peer.dc.addEventListener("open",function(){
            console.log("connection opened")
        })
    
        peer.dc.addEventListener("message",dcOnMessage)
        mapPeers[peerUsername] = [peer,peer.dc]
        
    })


   

    peer.addEventListener("iceconnectionstatechange",function(){
        var iceConnectionState = peer.iceConnectionState

        if(iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState==='closed') 
        {
            delete mapPeers[peerUsername]

            if(iceConnectionState !="closed")
            {
                peer.close()
            }
            removeVideo(remoteVideo)
        }
    })

    peer.addEventListener("icecandidate",function(event){
        if(event.candidate)
        {
            console.log("new ice candidate",JSON.stringify(peer.localDescription))
            return 
        }

        send_signal('new-answer',{
            'sdp':peer.localDescription,
            'receiver_channel_name':receiver_channel_name
        })
    })


    peer.setRemoteDescription(offer)
    .then(()=> {
        console.log('remote description set swuccessfully for %s',peerUsername)
        return peer.createAnswer()
    })
    .then(a =>{
        console.log("answer created!")
        peer.setLocalDescription(a)
    })
}