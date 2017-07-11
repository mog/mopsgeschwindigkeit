## pug
- no dynamic includes suck, how do we loop over components?
    the while "plugin.isActive" conditionals could be removed as well
- prepend is broken, which sucks for components that can append to head  
    Prepend and append have a bug, where doing this from an include results in duplicated code. As the tags do get appended and prependen, but a copy of that also remains at the same position 
- yaml for components header for documentation purposes
    Maybe there's a plugin?
    

## gulp
- index.pug.json no reload when something is changed
- new files arr not seen