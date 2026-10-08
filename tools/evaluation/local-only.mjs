// Promptfoo 0.123.1's viewer omits a listen host. Keep this process on loopback.
import net from 'node:net';
const listen=net.Server.prototype.listen;
net.Server.prototype.listen=function(...args){
 if(typeof args[0]==='number'&&(args.length===1||typeof args[1]==='function'))args.splice(1,0,'127.0.0.1');
 return listen.apply(this,args);
};
