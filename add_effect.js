const fs = require('fs');
const path = require('path');
const p = path.join('app', '(dashboard)', 'ventas', 'nueva', 'POSClient.tsx');
let content = fs.readFileSync(p, 'utf8');

const effectCode = 
  useEffect(() => {
    if (allowedMethods.length > 0 && !allowedMethods.find(m => m.id === paymentMethod)) {
      setPaymentMethod(allowedMethods[0].id);
    }
  }, [selectedCustomerId, allowedMethods, paymentMethod]);
;

content = content.replace(/(const \[paymentMethod, setPaymentMethod\] = useState[^;]+;)/, $1\n);
fs.writeFileSync(p, content);
console.log('Replaced successfully');
