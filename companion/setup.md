## SetUp your Neol EPowerSwitch with companion

this module uses the hidden page feature.

SETUP Neol Epowerswitch

The hidden page has to be activated in the admin tables

[YOURIP:port/admin/control.htm] (port is usually 2550)
navigate to Settings/Accounts


<img src="/documents/epower accounts.png" alt="Accounts" width="300"/>


check the activation box  Hidden Page


and edit user hidden 


<img src="/documents/epower hiddenuser.png" alt="Accounts" width="300"/>


DON'T set a username or password.
there is no Auth routine in the plugin.
Setup the Outlets witch should be controlable. 
Select them in the box below and hit the red rightgfaced arrow icon
(dont wonder about the reset only explanation. it is just an option!)


SETUP companion

enter the destination IP in the conection 
choose a polling interval (eg. 1000-2000 ms)

create a button choose the outlet and the switching option (force ON, force OFF, toggle)
create a feeback select the outlet and the button becomes green when switched ON

it also fills a variable $(ePower4:outlet_x) while x is the number of the outlet for each output with the state On or Off

