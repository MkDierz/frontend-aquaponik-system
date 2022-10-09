import { Fragment, useEffect, useRef, useState } from "react";
import { w3cwebsocket as W3CWebSocket } from "websocket";


function App() {
  const [sensorData, setSensorData] = useState({})
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState(null)
  const [log, setLog] = useState([])
  const [message, setMessage] = useState("")
  const [loop, setLoop] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const ws = useRef(null);
  const messagesEndRef = useRef(null)
  const disabled = (status === "DONE") || (status === "CONNECTED") || (status === "ERROR")

  const [server, setServer] = useState({
    address: '192.168.100.158',
    port: 81
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [log]);

  const onChange = e => setServer({ ...server, [e.target["name"]]: e.target.value })
  function strDecode(data) {
    try {
      return JSON.parse(decodeURIComponent(escape(data)));
    } catch (error) {
      console.log(error);
      setLoop(false);
      return {
        status: "DONE",
        data: [{
          name: "ERROR",
          value: "ERROR"
        }]
      }
    }
  }
  const connect = () => {
    if (server.address && server.port) {
      console.log('Connecting WebSocket Client');
      setConnecting(true)
      ws.connection = new W3CWebSocket(`ws://${server.address}:${server.port}`)
      ws.connection.onopen = () => {
        console.log('WebSocket Client Connected');
        setConnecting(false)
        setConnected(true)
      };

      ws.connection.onmessage = (message) => {
        let data
        try {
          data = strDecode(message.data)
        } catch (error) {
          console.log(error);
        }
        setLog(e => [...e, { from: message.origin, msg: { ...data } }])
      };

      ws.connection.onclose = () => {
        console.log('WebSocket Client Disconnected');
        setConnecting(false)
        setConnected(false)
        setLog([]);
      }

      ws.connection.onerror = e => {
        console.log(e);
      }
    }
  }
  const disconnect = () => {
    console.log('Disconnecting WebSocket Client connection');
    ws.connection.close()
    setConnected(false)
  }

  const sendMsg = () => {
    if (message) {
      ws.connection.send(message)
      setLog(e => [...e, {
        from: "localhost", msg: {
          status: "SENT"
        }
      }])
    }
  }

  const getWaterTemp = () => {
    setMessage("GET_WATER_TEMP")
    sendMsg()
  }
  const getAirTemp = () => {
    setMessage("GET_AIR_TEMP")
    sendMsg()
  }
  const getAll = () => {
    setMessage("GET_ALL")
    sendMsg()
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loop) {
        if (status === "DONE") {
          sendMsg()
        }
      }
    }, 0)
    return () => clearTimeout(timeout)
  }, [loop, status])

  useEffect(() => {
    if (log && log[log.length - 1] && "msg" in log[log.length - 1]) {
      setStatus(log[log.length - 1].msg.status)
      if ("data" in log[log.length - 1].msg) {
        const data = log[log.length - 1].msg.data
        data.forEach(d => {
          setSensorData(e => ({
            ...e,
            [d.name]: d.value,
          }))
        });
      }
    }
  }, [log])

  const SensorCard = () => Object.keys(sensorData).map(key =>
    <Fragment>
      <span>{key}</span>
      <span>{sensorData[key]}</span>
    </Fragment>
  )

  return (
    <div className="grid items-center w-full h-screen grid-flow-col grid-rows-2 bg-slate-500">
      <div className="px-8 pt-6 pb-8 mx-auto mb-4 bg-white rounded shadow-md ">
        <div className="mb-4">
          <label className="block mb-2 text-sm font-bold text-gray-700" >
            Server
          </label>
          <input className="text-input" type="text" name="address" placeholder="address" value={server.address} onChange={e => onChange(e)} />
        </div>
        <div className="mb-6">
          <label className="block mb-2 text-sm font-bold text-gray-700" >
            Port
          </label>
          <input className="text-input" type="number" name="port" placeholder="port" value={server.port} onChange={e => onChange(e)} />
        </div>
        <div className="flex items-center justify-between">
          <button className="btn disabled:bg-blue-200" onClick={connect} disabled={connecting || connected}>
            {connected ? "connected" : "connect"}
          </button>
          <button className="bg-red-500 btn hover:bg-red-600 disabled:bg-red-200 disabled:hover:bg-red-200" onClick={disconnect} disabled={connecting || !connected}>
            {connected ? "disconnect" : "disconnected"}
          </button>
        </div>
      </div>

      {
        connected &&
        <Fragment>
          <div className="grid grid-cols-2 gap-4 px-8 pt-6 pb-8 mx-auto mb-4 bg-white rounded shadow-md">
            <SensorCard />
          </div>
          <div className="container flex flex-col justify-between w-full h-full row-span-2 px-8 pt-6 pb-8 mx-auto mb-4 bg-white rounded shadow-md">
            {
              showLog &&
              <div className="grid justify-end grid-cols-2 overflow-auto font-mono">
                {log.map((d, index) => (
                  <Fragment key={index} >
                    <span className="">{d.from}:</span>
                    <pre>
                      {JSON.stringify(d.msg, undefined, 2)}
                    </pre>
                  </Fragment>
                ))}
                <div ref={messagesEndRef} />
              </div>
            }
            <div>
              <div className="grid grid-cols-2 gap-4 py-4" >
                <button className="btn" onClick={getWaterTemp} disabled={!disabled}>
                  Get Water Temp
                </button>
                <button className="btn " onClick={getAirTemp} disabled={!disabled}>
                  Get Air Temp
                </button>
                <button className="btn " onClick={getAll} disabled={!disabled}>
                  Get All Data
                </button>
                <button className="btn" onClick={() => setLoop(e => !e)}>
                  Monitor {String(loop)}
                </button>
                <button className="btn" onClick={() => setLog([])}>
                  Clear display
                </button>
              </div>
              <div className="flex">
                <input type="text" className="rounded-r-none text-input" value={message} onChange={e => { setMessage(e.target.value) }} />
                <button className="rounded-l-none btn" onClick={sendMsg} disabled={!disabled}>send</button>
              </div>
            </div>
          </div>
        </Fragment>
      }
    </div>
  );
}

export default App;
