echo 'Commit message:'
read commitmessage

git add -A
git commit -am "$commitmessage"
git push origin master